-- Local migration only. The final Supabase RPC owns the entire SQL transaction.
create table public.factures_peche (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations_peche(id),
  numero text not null,
  pdf_path text not null,
  date_emission timestamptz,
  date_sortie date not null,
  remplace_facture_id uuid references public.factures_peche(id),
  created_at timestamptz not null default now(),
  unique (reservation_id, pdf_path)
);
-- Legacy numbers may collide. Only the distinct new series is globally unique.
create unique index factures_peche_replacement_numero_key
  on public.factures_peche(numero) where numero like 'PEC-R-%';
create unique index factures_peche_one_replacement_key
  on public.factures_peche(remplace_facture_id) where remplace_facture_id is not null;
create sequence public.peche_replacement_invoice_seq;
alter table public.factures_peche enable row level security;
revoke all on public.factures_peche from public, anon, authenticated;
revoke all on sequence public.peche_replacement_invoice_seq from public, anon, authenticated;
grant select, insert on public.factures_peche to service_role;
grant usage on sequence public.peche_replacement_invoice_seq to service_role;

-- Read-only preview. The move repeats this check after acquiring locks.
create function public.check_peche_date_change(p_reservation_id uuid, p_date date, p_expected_date date)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.reservations_peche%rowtype;
  c public.boat_calendar_slots%rowtype;
  v_slot text; v_shared boolean; v_used integer; v_releasable boolean;
  v_salon jsonb;
begin
  select * into r from public.reservations_peche where id=p_reservation_id;
  if not found then raise exception 'Réservation Pêche introuvable.' using errcode='P0002'; end if;
  if r.date_sortie is distinct from p_expected_date then
    raise exception 'La réservation a changé. Rechargez la liste.' using errcode='P0001';
  end if;
  if p_date is null or p_date < (now() at time zone 'Pacific/Tahiti')::date or p_date=r.date_sortie then
    raise exception 'Choisissez une nouvelle date à venir.' using errcode='22023';
  end if;
  if r.statut_paiement in ('cancelled','failed') or not
    (r.paye or r.statut_paiement in ('paid','paye','deposit_paid','paiement_externe_a_facturer')) then
    raise exception 'Cette réservation ne peut pas être déplacée.' using errcode='P0001';
  end if;
  if cardinality(r.slots) not between 1 and 2 or
    (r.formule='full_day' and r.slots<>array['morning','afternoon']) or
    (r.formule in ('morning','afternoon') and r.slots<>array[r.formule]) then
    raise exception 'Créneaux de réservation incohérents.' using errcode='P0001';
  end if;
  if (r.facture_numero is null) <> (r.facture_url is null) then
    raise exception 'Références de facture incomplètes. Vérifiez la réservation.' using errcode='P0001';
  end if;
  select jsonb_build_object(
    'sale_id',s.id,'designation',i.libelle,'payment_method',s.payment_method,
    'total',s.montant_total,'paid',s.montant_encaisse,'balance',s.montant_solde,
    'valid_until',i.valid_until,'generated_at',s.facture_generee_at,
    'numero',s.facture_numero,'path',s.facture_url
  ) into v_salon from public.salon_sale_items i join public.salon_sales s on s.id=i.sale_id
    where i.reservation_type='reservations_peche' and i.reservation_id=r.id::text limit 1;
  if v_salon is not null and p_date > (v_salon->>'valid_until')::date then
    raise exception 'La nouvelle date dépasse la validité de l’offre Salon.' using errcode='22023';
  end if;
  select exists(select 1 from public.salon_sale_items i
    where i.reservation_type='reservations_peche' and i.reservation_id=r.id::text
      and (i.offer_code like 'peche_place_%' or i.offer_code like 'peche_2_plus_1_%')) into v_shared;
  foreach v_slot in array r.slots loop
    select * into c from public.boat_calendar_slots where date=p_date and slot=v_slot;
    v_releasable := false;
    if found and c.status='hold' then
      v_releasable := coalesce(c.expires_at<=now(),false);
      if c.reservation_table='reservations_peche' then
        v_releasable := v_releasable or exists(select 1 from public.reservations_peche x
          where x.id=c.reservation_id and not (coalesce(x.paye,false) or lower(coalesce(x.statut_paiement,'')) in ('paid','paye')));
      elsif c.reservation_table='reservations_baleines' then
        v_releasable := v_releasable or exists(select 1 from public.reservations_baleines x
          where x.id=c.reservation_id and not (coalesce(x.paye,false) or lower(coalesce(x.statut_paiement,'')) in ('paid','paye')));
      end if;
    end if;
    if c.id is not null and c.status<>'available' and not v_releasable
      and not (v_shared and c.status='reserved' and c.activity='peche') then
      raise exception 'Créneau bateau indisponible (%).',v_slot using errcode='P0001';
    end if;
    -- Pending unpaid holds are handled by the calendar rule above; active paid/manual
    -- outings and Salon participants must still be counted even if the calendar is missing.
    select coalesce(sum(x.nombre_personnes),0) into v_used from public.reservations_peche x
      where x.id<>r.id and x.date_sortie=p_date and v_slot=any(x.slots)
        and x.statut_paiement not in ('cancelled','failed')
        and (v_shared or x.paye or x.statut_paiement in ('paid','paye','deposit_paid','paiement_externe_a_facturer'));
    if (not v_shared and v_used>0) or (v_shared and v_used+r.nombre_personnes>4) then
      raise exception 'Capacité Pêche insuffisante (%).',v_slot using errcode='P0001';
    end if;
    if v_shared and exists(select 1 from public.reservations_peche x
      where x.id<>r.id and x.date_sortie=p_date and v_slot=any(x.slots)
        and x.statut_paiement not in ('cancelled','failed')
        and not exists(select 1 from public.salon_sale_items i
          where i.reservation_type='reservations_peche' and i.reservation_id=x.id::text
            and (i.offer_code like 'peche_place_%' or i.offer_code like 'peche_2_plus_1_%'))) then
      raise exception 'Une privatisation Pêche occupe ce créneau.' using errcode='P0001';
    end if;
  end loop;
  return jsonb_build_object('reservation',to_jsonb(r),'salon',v_salon);
end $$;

-- Allocate an immutable PDF filename before Storage upload. No reservation,
-- calendar or invoice reference is changed by this preparation RPC.
create function public.prepare_peche_date_change(p_reservation_id uuid, p_date date, p_expected_date date)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_context jsonb; v_number text; v_issued timestamptz := now();
begin
  v_context := public.check_peche_date_change(p_reservation_id,p_date,p_expected_date);
  if v_context->'reservation'->>'facture_numero' is not null then
    v_number := 'PEC-R-'||to_char(v_issued at time zone 'Pacific/Tahiti','YYYY')||'-'||
      nextval('public.peche_replacement_invoice_seq')::text;
  end if;
  return v_context || jsonb_build_object('date',p_date,'invoice_number',v_number,'issued_at',v_issued);
end $$;

create function public.move_peche_reservation(p_reservation_id uuid, p_date date, p_expected_date date, p_prepared jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_context jsonb; r public.reservations_peche%rowtype;
  v_day date; v_slot text; v_other uuid; v_old_invoice uuid; v_number text; v_path text;
  v_issued timestamptz;
begin
  -- Participate in both existing Salon locking conventions, in chronological order.
  for v_day in select distinct d from unnest(array[p_expected_date,p_date]) d order by d loop
    perform pg_advisory_xact_lock(hashtextextended('boat:'||v_day::text,0));
    foreach v_slot in array array['morning','afternoon'] loop
      perform pg_advisory_xact_lock(hashtextextended('boat_calendar_slots:'||v_day::text||':'||v_slot,0));
    end loop;
  end loop;
  -- Existing public hold writers do not use advisory locks. These table locks also
  -- cover missing destination rows during this short RPC, after PDF upload.
  lock table public.reservations_peche in share row exclusive mode;
  lock table public.boat_calendar_slots in share row exclusive mode;
  select * into r from public.reservations_peche where id=p_reservation_id for update;
  perform i.id from public.salon_sale_items i join public.salon_sales s on s.id=i.sale_id
    where i.reservation_type='reservations_peche' and i.reservation_id=r.id::text for update of s,i;
  v_context := public.check_peche_date_change(p_reservation_id,p_date,p_expected_date);
  if p_prepared is null
    or p_prepared->'reservation' is distinct from v_context->'reservation'
    or p_prepared->'salon' is distinct from v_context->'salon'
    or p_prepared->>'date' is distinct from p_date::text then
    raise exception 'La réservation ou la facture a changé. Rechargez la liste.' using errcode='P0001';
  end if;

  if r.facture_numero is not null and r.facture_url is not null then
    insert into public.factures_peche(reservation_id,numero,pdf_path,date_emission,date_sortie)
      values(r.id,r.facture_numero,r.facture_url,
        case when v_context->'salon'->>'numero'=r.facture_numero
          then (v_context->'salon'->>'generated_at')::timestamptz else null end,r.date_sortie)
      on conflict(reservation_id,pdf_path) do nothing;
    select id into v_old_invoice from public.factures_peche
      where reservation_id=r.id and pdf_path=r.facture_url and numero=r.facture_numero;
    if v_old_invoice is null then raise exception 'Historique de facture incohérent.' using errcode='P0001'; end if;
  end if;

  foreach v_slot in array r.slots loop
    insert into public.boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at)
      values(p_date,v_slot,'reserved','peche',r.id,'reservations_peche',null)
      on conflict(date,slot) do update set status='reserved',activity='peche',
        reservation_id=r.id,reservation_table='reservations_peche',expires_at=null,
        blocked_reason=null,blocked_by=null,blocked_at=null;
  end loop;
  update public.reservations_peche set date_sortie=p_date where id=r.id;
  foreach v_slot in array r.slots loop
    select x.id into v_other from public.reservations_peche x
      where x.id<>r.id and x.date_sortie=r.date_sortie and v_slot=any(x.slots)
        and x.statut_paiement not in ('cancelled','failed') order by x.created_at,x.id limit 1;
    if v_other is not null then
      -- Shared Salon rows can point to a different participant already.
      update public.boat_calendar_slots set reservation_id=v_other,reservation_table='reservations_peche'
        where date=r.date_sortie and slot=v_slot and activity='peche' and status='reserved';
    else
      update public.boat_calendar_slots set status='available',activity=null,reservation_id=null,
        reservation_table=null,expires_at=null,blocked_reason=null,blocked_by=null,blocked_at=null
        where date=r.date_sortie and slot=v_slot and reservation_table='reservations_peche'
          and activity='peche' and status in ('reserved','hold');
    end if;
  end loop;
  if v_old_invoice is not null then
    v_number := p_prepared->>'invoice_number';
    v_issued := (p_prepared->>'issued_at')::timestamptz;
    if v_number is null or v_number !~ '^PEC-R-[0-9]{4}-[1-9][0-9]*$' or v_issued is null then
      raise exception 'Préparation de facture invalide.' using errcode='22023';
    end if;
    v_path := 'factures/peche/remplacements/'||v_number||'.pdf';
    insert into public.factures_peche(reservation_id,numero,pdf_path,date_emission,date_sortie,remplace_facture_id)
      values(r.id,v_number,v_path,v_issued,p_date,v_old_invoice);
    update public.reservations_peche set facture_numero=v_number,facture_url=v_path where id=r.id;
    -- Update only this Pêche sale's matching invoice reference, never its money/status.
    update public.salon_sales set facture_numero=v_number,facture_url=v_path,facture_generee_at=v_issued
      where id=(v_context->'salon'->>'sale_id')::uuid
        and facture_numero=r.facture_numero and facture_url=r.facture_url;
  elsif p_prepared->>'invoice_number' is not null then
    raise exception 'Préparation de facture incohérente.' using errcode='22023';
  end if;
  return jsonb_build_object('date',p_date,'invoiceNumber',v_number);
end $$;
revoke all on function public.check_peche_date_change(uuid,date,date) from public,anon,authenticated;
revoke all on function public.prepare_peche_date_change(uuid,date,date) from public,anon,authenticated;
revoke all on function public.move_peche_reservation(uuid,date,date,jsonb) from public,anon,authenticated;
grant execute on function public.check_peche_date_change(uuid,date,date) to service_role;
grant execute on function public.prepare_peche_date_change(uuid,date,date) to service_role;
grant execute on function public.move_peche_reservation(uuid,date,date,jsonb) to service_role;
