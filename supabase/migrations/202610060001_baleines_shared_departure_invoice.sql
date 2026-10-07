-- Prepared locally only. Requires the existing capacity migration. No backfill.
begin;
create or replace function public.confirm_baleines_departure(
  p_reservation_id uuid, p_confirm_payment boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.reservations_baleines%rowtype;
  initial_date text; initial_depart text;
  s public.boat_calendar_slots%rowtype;
  w integer; o integer; used_w bigint; used_o bigint; slot_name text;
begin
  select * into r from public.reservations_baleines where id=p_reservation_id;
  if not found then raise exception 'Reservation Baleines introuvable' using errcode='PBI04'; end if;
  initial_date := r.date_sortie; initial_depart := r.depart;
  if r.date_sortie is null or r.depart is null or r.depart not in ('07:00','13:15') then
    raise exception 'Date ou depart Baleines invalide' using errcode='22023';
  end if;
  -- Same advisory and row locks as enforce_baleines_capacity.
  perform pg_advisory_xact_lock(hashtextextended('baleines-capacity:' || r.date_sortie || ':' || r.depart,0));
  insert into public.baleines_capacity_locks(date_sortie,depart) values(r.date_sortie,r.depart)
    on conflict(date_sortie,depart) do update set revision=baleines_capacity_locks.revision+1;
  select * into r from public.reservations_baleines where id=p_reservation_id for update;
  if not found or r.date_sortie is distinct from initial_date or r.depart is distinct from initial_depart then
    raise exception 'Reservation modifiee, reessayez' using errcode='40001';
  end if;
  if lower(coalesce(r.statut_paiement,'')) in ('cancelled','canceled','failed','refused','abandoned','unpaid') then
    raise exception 'Reservation Baleines inactive' using errcode='PBI09';
  end if;
  if p_confirm_payment then
    if r.source_paiement is null or r.source_paiement not in ('payzen_baleines','payzen_baleines_salon_tourisme_public') then
      raise exception 'Source de paiement Baleines invalide' using errcode='PBI09';
    end if;
  elsif not public.baleines_consumes_capacity(r.statut_paiement,r.paye,r.source_paiement,r.capacity_hold_expires_at,clock_timestamp()) then
    raise exception 'Reservation Baleines sans places confirmees' using errcode='PBI09';
  end if;
  -- Already-paid rows must also be checked: unchanged payment flags bypass the trigger.
  select water,observers into w,o from public.baleines_capacity_counts(r.participants::jsonb,r.nombre_mise_eau,r.nombre_observateurs);
  select coalesce(sum(c.water),0),coalesce(sum(c.observers),0) into used_w,used_o
    from public.reservations_baleines b
    cross join lateral public.baleines_capacity_counts(b.participants::jsonb,b.nombre_mise_eau,b.nombre_observateurs) c
    where b.date_sortie=r.date_sortie and b.depart=r.depart and b.id<>r.id
      and public.baleines_consumes_capacity(b.statut_paiement,b.paye,b.source_paiement,b.capacity_hold_expires_at,clock_timestamp());
  if coalesce(r.nombre_mise_eau,0)<0 or coalesce(r.nombre_observateurs,0)<0 or w+o<1 or used_w+w>6 or used_o+o>2 then
    raise exception 'Capacite Baleines insuffisante pour ce depart' using errcode='PBC01';
  end if;
  slot_name := case r.depart when '07:00' then 'morning' else 'afternoon' end;
  insert into public.boat_calendar_slots(date,slot,status) values(r.date_sortie::date,slot_name,'available')
    on conflict(date,slot) do nothing;
  select * into s from public.boat_calendar_slots where date=r.date_sortie::date and slot=slot_name for update;
  if s.status='blocked' or (s.status<>'available' and (s.activity is distinct from 'baleines' or s.reservation_table is distinct from 'reservations_baleines')) then
    raise exception 'Creneau bateau incompatible avec Baleines' using errcode='PBI09';
  end if;
  if s.status<>'reserved' then
    update public.boat_calendar_slots set status='reserved',activity='baleines',
      reservation_id=r.id,reservation_table='reservations_baleines',expires_at=null
      where id=s.id returning * into s;
  end if;
  -- A shared reserved Baleines slot keeps its original owner; never a second slot.
  if p_confirm_payment then
    update public.reservations_baleines set statut_paiement='paid',paye=true where id=r.id;
  end if;
  return jsonb_build_object('slots',jsonb_build_array(to_jsonb(s)));
end;
$$;
revoke all on function public.confirm_baleines_departure(uuid,boolean) from public,anon,authenticated;
grant execute on function public.confirm_baleines_departure(uuid,boolean) to service_role;

-- Durable single-worker claim across processes and callback/admin requests.
-- No automatic takeover: inspect a crashed worker instead of sending a second email.
create table public.baleines_invoice_deliveries (
  reservation_id uuid primary key references public.reservations_baleines(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  state text not null check(state in ('processing','failed','sent')),
  invoice_number text not null unique, invoice_path text not null unique,
  reservation_snapshot jsonb not null,
  customer_sent_at timestamptz, customer_attempted_at timestamptz,
  last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.baleines_invoice_deliveries enable row level security;
revoke all on public.baleines_invoice_deliveries from public,anon,authenticated;
grant select on public.baleines_invoice_deliveries to service_role;

create or replace function public.claim_baleines_invoice(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reservations_baleines%rowtype; j public.baleines_invoice_deliveries%rowtype; invoice_no text;
begin
  -- Consistent capacity -> reservation -> slot -> job locks.
  perform public.confirm_baleines_departure(p_reservation_id,false);
  select * into r from public.reservations_baleines where id=p_reservation_id for update;
  if r.paye is distinct from true or lower(coalesce(r.statut_paiement,'')) not in ('paid','paye') then
    raise exception 'Paiement Baleines non confirme' using errcode='PBI09';
  end if;
  if nullif(trim(r.responsable_email),'') is null or r.montant_total is null or r.montant_total<=0 then
    raise exception 'Email ou montant Baleines invalide' using errcode='PBI09';
  end if;
  select * into j from public.baleines_invoice_deliveries where reservation_id=r.id for update;
  if found then
    if j.state='sent' then return jsonb_build_object('already_sent',true); end if;
    if j.state='processing' then raise exception 'Facture deja en cours de traitement' using errcode='PBI09'; end if;
    if j.customer_attempted_at < clock_timestamp()-interval '23 hours' and j.customer_sent_at is null then
      raise exception 'Envoi client incertain: verifier Resend avant toute reprise' using errcode='PBI09';
    end if;
    if j.reservation_snapshot->>'montant_total' is distinct from r.montant_total::text
      or j.reservation_snapshot->>'responsable_email' is distinct from r.responsable_email
      or j.reservation_snapshot->>'date_sortie' is distinct from r.date_sortie
      or j.reservation_snapshot->>'depart' is distinct from r.depart
      or j.reservation_snapshot->'participants' is distinct from to_jsonb(r.participants)
      or r.email_sent is true
      or (r.facture_numero is not null and r.facture_numero is distinct from j.invoice_number)
      or (r.facture_url is not null and r.facture_url is distinct from j.invoice_path) then
      raise exception 'Reservation ou facture modifiee: reprise refusee' using errcode='PBI09';
    end if;
    update public.baleines_invoice_deliveries set state='processing',token=gen_random_uuid(),last_error=null,updated_at=now()
      where reservation_id=r.id returning * into j;
  else
    -- Historical completed invoices are acknowledged without generating again.
    if r.email_sent is true and r.facture_numero is not null and r.facture_url is not null then
      return jsonb_build_object('already_sent',true);
    end if;
    if r.facture_numero is not null or r.facture_url is not null or r.email_sent is true then
      raise exception 'Une facture ou un envoi existe deja' using errcode='PBI09';
    end if;
    -- Full UUID avoids the collisions possible with six-digit invoice suffixes.
    invoice_no := 'BAL-' || extract(year from now())::text || '-' || replace(r.id::text,'-','');
    insert into public.baleines_invoice_deliveries(reservation_id,state,invoice_number,invoice_path,reservation_snapshot)
      values(r.id,'processing',invoice_no,'factures/baleines/' || invoice_no || '.pdf',to_jsonb(r)) returning * into j;
  end if;
  return to_jsonb(j);
end;
$$;

create or replace function public.finish_baleines_invoice(
  p_reservation_id uuid,p_token uuid,p_action text,p_error text default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare j public.baleines_invoice_deliveries%rowtype;
begin
  perform 1 from public.reservations_baleines where id=p_reservation_id for update;
  select * into j from public.baleines_invoice_deliveries
    where reservation_id=p_reservation_id and token=p_token and state='processing' for update;
  if not found then raise exception 'Verrou facture invalide' using errcode='PBI09'; end if;
  if p_action<>'failed' and not exists (
    select 1 from public.reservations_baleines r where r.id=p_reservation_id
      and r.paye is true and lower(coalesce(r.statut_paiement,'')) in ('paid','paye')
      and r.montant_total::text is not distinct from j.reservation_snapshot->>'montant_total'
      and r.responsable_email is not distinct from j.reservation_snapshot->>'responsable_email'
      and r.date_sortie is not distinct from j.reservation_snapshot->>'date_sortie'
      and r.depart is not distinct from j.reservation_snapshot->>'depart'
      and to_jsonb(r.participants) is not distinct from j.reservation_snapshot->'participants'
      and (r.facture_numero is null or r.facture_numero=j.invoice_number)
      and (r.facture_url is null or r.facture_url=j.invoice_path)
  ) then
    raise exception 'Reservation ou facture modifiee: traitement refuse' using errcode='PBI09';
  end if;
  if p_action='invoice' then
    update public.reservations_baleines set facture_numero=j.invoice_number,facture_url=j.invoice_path where id=p_reservation_id;
  elsif p_action='customer_attempt' then
    update public.baleines_invoice_deliveries set customer_attempted_at=coalesce(customer_attempted_at,now()) where reservation_id=p_reservation_id;
  elsif p_action='customer' then
    update public.baleines_invoice_deliveries set customer_sent_at=now() where reservation_id=p_reservation_id;
  elsif p_action='sent' then
    if j.customer_sent_at is null then raise exception 'Envoi client non confirme' using errcode='PBI09'; end if;
    update public.reservations_baleines set email_sent=true,email_sent_at=now() where id=p_reservation_id;
    update public.baleines_invoice_deliveries set state='sent',updated_at=now(),last_error=null where reservation_id=p_reservation_id;
  elsif p_action='failed' then
    update public.baleines_invoice_deliveries set state='failed',updated_at=now(),last_error=left(p_error,2000) where reservation_id=p_reservation_id;
  else raise exception 'Action facture invalide' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.claim_baleines_invoice(uuid) from public,anon,authenticated;
revoke all on function public.finish_baleines_invoice(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_baleines_invoice(uuid) to service_role;
grant execute on function public.finish_baleines_invoice(uuid,uuid,text,text) to service_role;
commit;
