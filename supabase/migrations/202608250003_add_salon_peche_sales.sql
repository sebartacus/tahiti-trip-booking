create table if not exists public.salon_peche_rights (
  id uuid primary key default gen_random_uuid(),
  sale_item_id uuid unique references public.salon_sale_items(id) on delete cascade,
  offer_code text not null,
  offer_type text not null check (offer_type in ('privatisation','two_plus_one')),
  formule text not null check (formule in ('half_day','full_day')),
  nombre_personnes integer not null check (nombre_personnes between 1 and 4),
  montant_paye integer not null check (montant_paye >= 0),
  valid_until date not null,
  status text not null default 'unused' check (status in ('unused','redeemed')),
  reservation_id uuid references public.reservations_peche(id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
alter table public.salon_peche_rights enable row level security;
revoke all on public.salon_peche_rights from anon, authenticated;
grant select, insert, update, delete on public.salon_peche_rights to service_role;

create or replace function public.create_salon_peche_sale(
  p_offer_code text, p_price integer, p_prenom text, p_nom text, p_telephone text, p_email text,
  p_payment_method text, p_payment_reference text, p_commentaire text, p_nombre_personnes integer,
  p_date_sortie date, p_depart text
) returns table (sale_id uuid, item_id uuid, reservation_id uuid, right_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_kind text; v_formula text; v_label text; v_price integer; v_people integer;
  v_slots text[]; v_sale uuid; v_item uuid; v_res uuid; v_right uuid; v_slot text;
  v_used integer; v_calendar uuid;
begin
  select kind, formula, label, people into v_kind,v_formula,v_label,v_people
  from (values
    ('peche_privatisation_demi_journee','privatisation','half_day','Privatisation du bateau — demi-journée',4),
    ('peche_privatisation_journee','privatisation','full_day','Privatisation du bateau — journée',4),
    ('peche_place_demi_journee','place','half_day','Une place Pêche — demi-journée',1),
    ('peche_place_journee','place','full_day','Une place Pêche — journée',1),
    ('peche_2_plus_1_demi_journee','two_plus_one','half_day','Offre Pêche 2+1 — demi-journée — 3 personnes',3),
    ('peche_2_plus_1_journee','two_plus_one','full_day','Offre Pêche 2+1 — journée — 3 personnes',3)
  ) o(code,kind,formula,label,people) where code=p_offer_code;
  if v_kind is null or p_price <= 0 then raise exception 'Offre Pêche Salon invalide' using errcode='22023'; end if;
  v_price := p_price;
  if v_kind='privatisation' then
    if p_nombre_personnes not between 1 and 4 then raise exception 'Une privatisation accepte de 1 à 4 participants' using errcode='22023'; end if;
    v_people := p_nombre_personnes;
  elsif p_nombre_personnes <> v_people then raise exception 'Nombre de participants incorrect pour cette offre' using errcode='22023'; end if;
  if p_payment_method not in ('tpe','especes','cheque','virement') or nullif(trim(p_prenom),'') is null or nullif(trim(p_nom),'') is null or nullif(trim(p_telephone),'') is null then
    raise exception 'Client ou paiement Salon invalide' using errcode='22023';
  end if;
  if p_date_sortie is null and v_kind='place' then raise exception 'La date est obligatoire pour une place individuelle' using errcode='22023'; end if;
  if p_date_sortie is not null then
    if p_date_sortie < current_date or p_date_sortie > date '2027-01-31' then raise exception 'Date Pêche invalide' using errcode='22023'; end if;
    if v_formula='full_day' then
      if p_depart <> 'morning' then raise exception 'Départ journée invalide' using errcode='22023'; end if;
      v_slots := array['morning','afternoon'];
    elsif p_depart in ('morning','afternoon') then v_slots := array[p_depart];
    else raise exception 'Départ demi-journée invalide' using errcode='22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended('boat:'||p_date_sortie::text,0));
    foreach v_slot in array v_slots loop
      if exists(select 1 from public.boat_calendar_slots where date=p_date_sortie and slot=v_slot and status <> 'available' and activity is distinct from 'peche') then raise exception 'Créneau bateau indisponible' using errcode='P0001'; end if;
      if exists(select 1 from public.reservations_peche r where r.date_sortie=p_date_sortie and v_slot=any(r.slots) and r.statut_paiement not in ('cancelled','failed') and not exists(select 1 from public.salon_sale_items i where i.reservation_type='reservations_peche' and i.reservation_id=r.id::text and (i.offer_code like 'peche_place_%' or i.offer_code like 'peche_2_plus_1_%'))) then raise exception 'Une privatisation Pêche occupe ce créneau' using errcode='P0001'; end if;
      select coalesce(sum(r.nombre_personnes),0) into v_used from public.reservations_peche r where r.date_sortie=p_date_sortie and v_slot=any(r.slots) and r.statut_paiement not in ('cancelled','failed');
      if v_kind='privatisation' and v_used>0 or v_kind<>'privatisation' and v_used+v_people>4 then raise exception 'Capacité Pêche insuffisante' using errcode='P0001'; end if;
    end loop;
  end if;
  insert into public.salon_sales(client_prenom,client_nom,client_telephone,client_email,payment_method,payment_reference,montant_total,montant_encaisse,montant_solde,statut,commentaire_interne)
  values(trim(p_prenom),trim(p_nom),trim(p_telephone),nullif(trim(p_email),''),p_payment_method,nullif(trim(p_payment_reference),''),v_price,v_price,0,'invoice_pending',nullif(trim(p_commentaire),'')) returning id into v_sale;
  if p_date_sortie is not null then
    insert into public.reservations_peche(date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,montant_total,montant_paye,type_paiement,statut_paiement,paye,origine,commentaire)
    values(p_date_sortie,case when v_formula='full_day' then 'full_day' else p_depart end,v_slots,v_people,trim(p_prenom),trim(p_nom),nullif(trim(p_email),''),trim(p_telephone),v_price,v_price,'full','paid',true,'salon_admin',nullif(trim(p_commentaire),'')) returning id into v_res;
  end if;
  insert into public.salon_sale_items(sale_id,activity,offer_code,libelle,quantity,unit_price,total_price,valid_until,status,reservation_type,reservation_id)
  values(v_sale,'peche',p_offer_code,v_label,1,v_price,v_price,date '2027-01-31','reserved',case when v_res is null then 'salon_peche_rights' else 'reservations_peche' end,coalesce(v_res::text,'')) returning id into v_item;
  if v_res is null then
    insert into public.salon_peche_rights(sale_item_id,offer_code,offer_type,formule,nombre_personnes,montant_paye,valid_until)
    values(v_item,p_offer_code,v_kind,v_formula,v_people,v_price,date '2027-01-31') returning id into v_right;
    update public.salon_sale_items set reservation_id=v_right::text where id=v_item;
  else
    foreach v_slot in array v_slots loop
      insert into public.boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at)
      values(p_date_sortie,v_slot,'reserved','peche',v_res,'reservations_peche',null)
      on conflict(date,slot) do update set status='reserved',activity='peche',expires_at=null where boat_calendar_slots.status='available' or boat_calendar_slots.activity='peche'
      returning id into v_calendar;
      if v_calendar is null then raise exception 'Créneau bateau indisponible' using errcode='P0001'; end if;
    end loop;
  end if;
  return query select v_sale,v_item,v_res,v_right;
end; $$;
revoke all on function public.create_salon_peche_sale(text,integer,text,text,text,text,text,text,text,integer,date,text) from public;
grant execute on function public.create_salon_peche_sale(text,integer,text,text,text,text,text,text,text,integer,date,text) to service_role;

create or replace function public.admin_delete_salon_peche_item(p_sale_id uuid,p_item_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item public.salon_sale_items%rowtype; v_date date; v_slots text[]; v_status text; v_path text; v_remaining integer; v_slot text; v_other uuid;
begin
  select * into v_item from public.salon_sale_items where id=p_item_id and sale_id=p_sale_id and activity='peche' for update;
  if not found then return jsonb_build_object('deleted',false); end if;
  select facture_url into v_path from public.salon_sales where id=p_sale_id for update;
  if v_item.reservation_type='salon_peche_rights' then
    select status into v_status from public.salon_peche_rights where id=v_item.reservation_id::uuid for update;
    if v_status is distinct from 'unused' then raise exception 'Ce droit Pêche a déjà été utilisé.' using errcode='P0001'; end if;
    delete from public.salon_peche_rights where id=v_item.reservation_id::uuid;
  elsif v_item.reservation_type='reservations_peche' then
    select date_sortie,slots into v_date,v_slots from public.reservations_peche where id=v_item.reservation_id::uuid for update;
    if v_date <= current_date then raise exception 'Cette sortie Pêche est passée ou en cours.' using errcode='P0001'; end if;
    delete from public.reservations_peche where id=v_item.reservation_id::uuid;
    foreach v_slot in array v_slots loop
      select r.id into v_other from public.reservations_peche r where r.date_sortie=v_date and v_slot=any(r.slots) and r.statut_paiement not in ('cancelled','failed') order by r.created_at limit 1;
      if v_other is null then update public.boat_calendar_slots set status='available',activity=null,reservation_id=null,reservation_table=null,expires_at=null where date=v_date and slot=v_slot and activity='peche';
      else update public.boat_calendar_slots set reservation_id=v_other,reservation_table='reservations_peche' where date=v_date and slot=v_slot and activity='peche'; end if;
    end loop;
  else raise exception 'Référence Pêche Salon invalide' using errcode='22023'; end if;
  delete from public.salon_sale_items where id=v_item.id;
  select count(*) into v_remaining from public.salon_sale_items where sale_id=p_sale_id;
  if v_remaining=0 then delete from public.salon_sales where id=p_sale_id; end if;
  return jsonb_build_object('deleted',true,'saleDeleted',v_remaining=0,'invoicePath',v_path);
end; $$;
revoke all on function public.admin_delete_salon_peche_item(uuid,uuid) from public;
grant execute on function public.admin_delete_salon_peche_item(uuid,uuid) to service_role;
