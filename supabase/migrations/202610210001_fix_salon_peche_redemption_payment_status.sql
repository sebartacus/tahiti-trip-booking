-- Pêche deposits use paid + type_paiement=deposit; preserve all existing amounts.
create or replace function public.redeem_salon_peche_right(p_right_id uuid,p_date_sortie date,p_depart text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_right public.salon_peche_rights%rowtype; v_item public.salon_sale_items%rowtype; v_sale public.salon_sales%rowtype;
  v_slots text[]; v_slot text; v_used integer; v_res uuid; v_calendar uuid;
begin
  select * into v_right from public.salon_peche_rights where id=p_right_id for update;
  if not found or v_right.status<>'unused' then raise exception 'Droit Peche indisponible' using errcode='P0001'; end if;
  select * into v_item from public.salon_sale_items where id=v_right.sale_item_id for update;
  select * into v_sale from public.salon_sales where id=v_item.sale_id for update;
  if p_date_sortie<current_date or p_date_sortie>v_right.valid_until then raise exception 'Date Peche hors validite' using errcode='22023'; end if;
  if v_right.formule='full_day' then if p_depart<>'morning' then raise exception 'Depart journee invalide' using errcode='22023'; end if; v_slots:=array['morning','afternoon'];
  elsif p_depart in ('morning','afternoon') then v_slots:=array[p_depart]; else raise exception 'Depart demi-journee invalide' using errcode='22023'; end if;
  if v_right.offer_type='two_plus_one' and v_right.nombre_personnes<>3 then raise exception 'Le droit 2+1 exige 3 participants' using errcode='22023'; end if;
  foreach v_slot in array v_slots loop
    perform pg_advisory_xact_lock(hashtextextended('boat_calendar_slots:'||p_date_sortie::text||':'||v_slot,0));
  end loop;
  foreach v_slot in array v_slots loop
    if exists(select 1 from public.boat_calendar_slots where date=p_date_sortie and slot=v_slot and status<>'available' and activity is distinct from 'peche') then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
    if exists(select 1 from public.reservations_peche r where r.date_sortie=p_date_sortie and v_slot=any(r.slots) and r.statut_paiement not in ('cancelled','failed') and not exists(select 1 from public.salon_sale_items i where i.reservation_type='reservations_peche' and i.reservation_id=r.id::text and (i.offer_code like 'peche_place_%' or i.offer_code like 'peche_2_plus_1_%'))) then raise exception 'Une privatisation Peche occupe ce creneau' using errcode='P0001'; end if;
    select coalesce(sum(nombre_personnes),0) into v_used from public.reservations_peche where date_sortie=p_date_sortie and v_slot=any(slots) and statut_paiement not in ('cancelled','failed');
    if v_right.offer_type='privatisation' and v_used>0 or v_right.offer_type<>'privatisation' and v_used+v_right.nombre_personnes>4 then raise exception 'Capacite Peche insuffisante' using errcode='P0001'; end if;
  end loop;
  insert into public.reservations_peche(date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,montant_total,montant_paye,type_paiement,statut_paiement,paye,origine)
  values(p_date_sortie,case when v_right.formule='full_day' then 'full_day' else p_depart end,v_slots,v_right.nombre_personnes,v_sale.client_prenom,v_sale.client_nom,coalesce(v_sale.client_email,''),v_sale.client_telephone,v_sale.montant_total,v_sale.montant_encaisse,case when v_sale.montant_solde>0 then 'deposit' else 'full' end,'paid',true,'salon_admin') returning id into v_res;
  foreach v_slot in array v_slots loop
    insert into public.boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at) values(p_date_sortie,v_slot,'reserved','peche',v_res,'reservations_peche',null)
    on conflict(date,slot) do update set status='reserved',activity='peche',reservation_id=v_res,reservation_table='reservations_peche',expires_at=null where boat_calendar_slots.status='available' or boat_calendar_slots.activity='peche' returning id into v_calendar;
    if v_calendar is null then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
  end loop;
  update public.salon_peche_rights set status='redeemed',reservation_id=v_res,redeemed_at=now() where id=p_right_id;
  update public.salon_sale_items set reservation_type='reservations_peche',reservation_id=v_res::text,status='redeemed' where id=v_item.id;
  return v_res;
end;
$$;
