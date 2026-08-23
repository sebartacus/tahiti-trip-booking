alter table public.salon_sale_items alter column valid_until drop not null;

create table if not exists public.salon_baleines_rights (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.salon_sales(id) on delete cascade,
  offer_code text not null,
  label text not null,
  composition jsonb not null,
  status text not null default 'unused' check (status in ('unused', 'redeemed', 'cancelled')),
  reservation_id uuid,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
alter table public.salon_baleines_rights enable row level security;
revoke all on public.salon_baleines_rights from anon, authenticated;
grant select, insert, update, delete on public.salon_baleines_rights to service_role;

create or replace function public.create_salon_baleines_sale(
  p_offer_code text, p_label text, p_composition jsonb, p_total integer,
  p_prenom text, p_nom text, p_telephone text, p_email text,
  p_payment_method text, p_payment_reference text, p_commentaire text,
  p_date_sortie date, p_depart text, p_participants jsonb
) returns table (sale_id uuid, item_id uuid, reservation_id uuid, right_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_sale_id uuid; v_item_id uuid; v_reservation_id uuid; v_right_id uuid;
  v_mise integer := coalesce((p_composition->>'mise_eau')::integer, 0);
  v_observateurs integer := coalesce((p_composition->>'observateur')::integer, 0)
    + coalesce((p_composition->>'enfant_moins_12')::integer, 0)
    + coalesce((p_composition->>'enfant_moins_5')::integer, 0);
  v_used_mise integer; v_used_observateurs integer; v_slot text; v_calendar_id uuid;
begin
  if p_offer_code not in ('baleines_individuel', 'baleines_5_plus_1') or p_total < 0 then
    raise exception 'Offre Baleines Salon invalide' using errcode = '22023';
  end if;
  if p_offer_code = 'baleines_5_plus_1' and (v_mise <> 6 or v_observateurs <> 0) then
    raise exception 'L offre 5+1 exige exactement 6 mises a l eau' using errcode = '22023';
  end if;
  if v_mise > 6 or v_observateurs > 2 or v_mise + v_observateurs < 1 then
    raise exception 'Composition Baleines invalide' using errcode = '22023';
  end if;
  if p_payment_method not in ('tpe', 'especes', 'cheque', 'virement') then
    raise exception 'Paiement Salon invalide' using errcode = '22023';
  end if;

  if p_date_sortie is not null then
    if p_depart not in ('07:00', '13:15') or jsonb_typeof(p_participants) is distinct from 'array'
      or jsonb_array_length(p_participants) <> v_mise + v_observateurs then
      raise exception 'Sortie ou participants Baleines invalides' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('baleines-capacity:' || p_date_sortie::text || ':' || p_depart, 0));
    select
      coalesce(sum(r.nombre_mise_eau), 0), coalesce(sum(r.nombre_observateurs), 0)
    into v_used_mise, v_used_observateurs
    from public.reservations_baleines r
    where r.date_sortie = p_date_sortie and r.depart = p_depart
      and (r.paye = true or r.statut_paiement in ('paid', 'paye'));
    if v_used_mise + v_mise > 6 or v_used_observateurs + v_observateurs > 2 then
      raise exception 'Capacite Baleines insuffisante pour ce depart' using errcode = 'P0001';
    end if;
    v_slot := case when p_depart = '07:00' then 'morning' else 'afternoon' end;
    if exists (select 1 from public.boat_calendar_slots where date = p_date_sortie and slot = v_slot and status <> 'available' and activity is distinct from 'baleines') then
      raise exception 'Creneau bateau indisponible' using errcode = 'P0001';
    end if;
  end if;

  insert into public.salon_sales(client_prenom, client_nom, client_telephone, client_email, payment_method,
    payment_reference, montant_total, montant_encaisse, montant_solde, statut, commentaire_interne)
  values(trim(p_prenom), trim(p_nom), trim(p_telephone), nullif(trim(p_email), ''), p_payment_method,
    nullif(trim(p_payment_reference), ''), p_total, p_total, 0, 'invoice_pending', nullif(trim(p_commentaire), ''))
  returning id into v_sale_id;

  if p_date_sortie is null then
    insert into public.salon_baleines_rights(sale_id, offer_code, label, composition)
    values(v_sale_id, p_offer_code, p_label, p_composition) returning id into v_right_id;
  else
    insert into public.reservations_baleines(date_sortie, depart, responsable_prenom, responsable_nom,
      responsable_email, responsable_telephone, participants, nombre_mise_eau, nombre_observateurs,
      montant_total, devise, statut_paiement, paye, source_paiement, paid_at)
    values(p_date_sortie, p_depart, trim(p_prenom), trim(p_nom), nullif(trim(p_email), ''), trim(p_telephone),
      p_participants, v_mise, v_observateurs, p_total, 'XPF', 'paid', true, 'salon_admin', now())
    returning id into v_reservation_id;

    insert into public.boat_calendar_slots(date, slot, status, activity, reservation_id, reservation_table, expires_at)
    values(p_date_sortie, v_slot, 'reserved', 'baleines', v_reservation_id, 'reservations_baleines', null)
    on conflict(date, slot) do update set status = 'reserved', activity = 'baleines', expires_at = null
    where boat_calendar_slots.status = 'available' or boat_calendar_slots.activity = 'baleines'
    returning id into v_calendar_id;
    if v_calendar_id is null then raise exception 'Creneau bateau indisponible' using errcode = 'P0001'; end if;
  end if;

  insert into public.salon_sale_items(sale_id, activity, offer_code, libelle, quantity, unit_price,
    total_price, valid_until, status, reservation_type, reservation_id)
  values(v_sale_id, 'baleines', p_offer_code, p_label, 1, p_total, p_total, null, 'reserved',
    case when v_reservation_id is null then 'salon_baleines_rights' else 'reservations_baleines' end,
    coalesce(v_reservation_id, v_right_id)::text)
  returning id into v_item_id;
  return query select v_sale_id, v_item_id, v_reservation_id, v_right_id;
end;
$$;
revoke all on function public.create_salon_baleines_sale(text,text,jsonb,integer,text,text,text,text,text,text,text,date,text,jsonb) from public;
grant execute on function public.create_salon_baleines_sale(text,text,jsonb,integer,text,text,text,text,text,text,text,date,text,jsonb) to service_role;

create or replace function public.admin_delete_salon_baleines_item(p_sale_id uuid, p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item public.salon_sale_items%rowtype; v_invoice_path text; v_remaining integer;
  v_total integer; v_paid integer; v_date date; v_depart text; v_other uuid; v_status text;
begin
  select * into v_item from public.salon_sale_items where id = p_item_id and sale_id = p_sale_id and activity = 'baleines' for update;
  if not found then return jsonb_build_object('deleted', false, 'reason', 'not_found'); end if;
  select facture_url into v_invoice_path from public.salon_sales where id = p_sale_id for update;

  if v_item.reservation_type = 'salon_baleines_rights' then
    select status into v_status from public.salon_baleines_rights where id = v_item.reservation_id::uuid for update;
    if v_status is distinct from 'unused' then raise exception 'Ce droit Baleines a déjà été utilisé et ne peut pas être supprimé.' using errcode = 'P0001'; end if;
    delete from public.salon_baleines_rights where id = v_item.reservation_id::uuid;
  elsif v_item.reservation_type = 'reservations_baleines' then
    select date_sortie, depart into v_date, v_depart from public.reservations_baleines where id = v_item.reservation_id::uuid for update;
    if not found then raise exception 'Réservation Baleines liée introuvable.' using errcode = '23503'; end if;
    if v_date <= current_date then raise exception 'Cette sortie Baleines est passée ou en cours et ne peut pas être supprimée.' using errcode = 'P0001'; end if;
    delete from public.reservations_baleines where id = v_item.reservation_id::uuid;
    select id into v_other from public.reservations_baleines where date_sortie = v_date and depart = v_depart and (paye = true or statut_paiement in ('paid','paye')) order by created_at limit 1;
    if v_other is null then
      update public.boat_calendar_slots set status='available', activity=null, reservation_id=null, reservation_table=null, expires_at=null
      where date=v_date and slot=case when v_depart='07:00' then 'morning' else 'afternoon' end and activity='baleines';
    else
      update public.boat_calendar_slots set reservation_id=v_other, reservation_table='reservations_baleines'
      where date=v_date and slot=case when v_depart='07:00' then 'morning' else 'afternoon' end and activity='baleines';
    end if;
  else
    raise exception 'Référence Baleines Salon invalide.' using errcode = '22023';
  end if;

  delete from public.salon_sale_items where id = v_item.id;
  select count(*), coalesce(sum(total_price),0) into v_remaining,v_total from public.salon_sale_items where sale_id=p_sale_id;
  if v_remaining=0 then delete from public.salon_sales where id=p_sale_id;
  else
    select least(montant_encaisse,v_total) into v_paid from public.salon_sales where id=p_sale_id;
    update public.salon_sales set montant_total=v_total,montant_encaisse=v_paid,montant_solde=v_total-v_paid,
      statut=case when v_paid=v_total then 'paid' when v_paid>0 then 'partial' else 'invoice_pending' end,
      facture_numero=null,facture_url=null,facture_generee_at=null,facture_envoyee_at=null where id=p_sale_id;
  end if;
  return jsonb_build_object('deleted',true,'saleDeleted',v_remaining=0,'invoicePath',v_invoice_path);
end;
$$;
revoke all on function public.admin_delete_salon_baleines_item(uuid,uuid) from public;
grant execute on function public.admin_delete_salon_baleines_item(uuid,uuid) to service_role;
