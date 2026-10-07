-- Follow-up to the already-applied 202610060001. No backfill or calendar changes.
begin;
create or replace function public.claim_baleines_invoice(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reservations_baleines%rowtype; j public.baleines_invoice_deliveries%rowtype; invoice_no text;
begin
  -- Invoice locks only: no capacity or calendar dependency.
  select * into r from public.reservations_baleines where id=p_reservation_id for update;
  if not found then raise exception 'Reservation Baleines introuvable' using errcode='PBI04'; end if;
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
      or (r.email_sent is true and j.customer_sent_at is null)
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
    update public.reservations_baleines set email_sent=true,email_sent_at=now() where id=p_reservation_id;
  elsif p_action='sent' then
    if j.customer_sent_at is null then raise exception 'Envoi client non confirme' using errcode='PBI09'; end if;
    update public.reservations_baleines set email_sent=true,email_sent_at=coalesce(email_sent_at,j.customer_sent_at) where id=p_reservation_id;
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
