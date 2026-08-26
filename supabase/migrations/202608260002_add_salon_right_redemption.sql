alter table public.salon_baleines_rights
  add column if not exists reservation_id uuid references public.reservations_baleines(id);

create or replace function public.redeem_salon_baleines_right(
  p_right_id uuid, p_date_sortie date, p_depart text, p_participants jsonb
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_right public.salon_baleines_rights%rowtype; v_sale public.salon_sales%rowtype;
  v_item public.salon_sale_items%rowtype; v_mise integer; v_obs integer; v_used_mise integer;
  v_used_obs integer; v_slot text; v_res uuid; v_calendar uuid; v_participant jsonb;
  v_participant_mise integer:=0; v_participant_observateur integer:=0;
  v_participant_enfant_12 integer:=0; v_participant_enfant_5 integer:=0;
  v_type text; v_role_attendu text; v_age integer; v_materiel_perso boolean; v_taille text; v_pointure text;
begin
  select * into v_right from public.salon_baleines_rights where id=p_right_id for update;
  if not found or v_right.status<>'unused' then raise exception 'Droit Baleines indisponible' using errcode='P0001'; end if;
  select * into v_item from public.salon_sale_items where id=(select id from public.salon_sale_items where reservation_type='salon_baleines_rights' and reservation_id=p_right_id::text) for update;
  select * into v_sale from public.salon_sales where id=v_item.sale_id for update;
  if p_date_sortie<current_date or p_date_sortie<date '2026-07-20' or p_date_sortie>v_right.valid_until then raise exception 'Date Baleines hors validite' using errcode='22023'; end if;
  if p_depart not in ('07:00','13:15') or jsonb_typeof(p_participants) is distinct from 'array' then raise exception 'Depart ou participants Baleines invalides' using errcode='22023'; end if;
  v_mise:=coalesce((v_right.composition->>'mise_eau')::integer,0);
  v_obs:=coalesce((v_right.composition->>'observateur')::integer,0)+coalesce((v_right.composition->>'enfant_moins_12')::integer,0)+coalesce((v_right.composition->>'enfant_moins_5')::integer,0);
  if jsonb_array_length(p_participants)<>v_mise+v_obs then raise exception 'Composition Baleines modifiee' using errcode='22023'; end if;
  for v_participant in select value from jsonb_array_elements(p_participants) loop
    v_type:=coalesce(v_participant->>'type','');
    if v_type='mise_eau' then
      v_role_attendu:='mise_eau';
    else
      v_role_attendu:='observateur';
    end if;
    if v_type not in ('mise_eau','observateur','enfant_moins_12','enfant_moins_5')
      or nullif(btrim(v_participant->>'prenom'),'') is null
      or nullif(btrim(v_participant->>'nom'),'') is null
      or coalesce(v_participant->>'role','')<>v_role_attendu
      or coalesce(v_participant->>'age','') !~ '^[0-9]{1,3}$' then
      raise exception 'Participant Baleines invalide' using errcode='22023';
    end if;
    v_age:=(v_participant->>'age')::integer;
    if v_age>120
      or (v_type='mise_eau' and v_age<12)
      or (v_type='enfant_moins_12' and (v_age<5 or v_age>=12))
      or (v_type='enfant_moins_5' and v_age>=5) then
      raise exception 'Age participant Baleines invalide' using errcode='22023';
    end if;
    v_materiel_perso:=coalesce((v_participant->>'materielPerso')::boolean,false);
    v_taille:=coalesce(v_participant->>'tailleCombinaison','');
    v_pointure:=coalesce(v_participant->>'pointurePalmes','');
    if v_type='mise_eau' and not v_materiel_perso
      and (v_taille not in ('XS','S','M','L','XL','XXL')
        or v_pointure not in ('34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49')) then
      raise exception 'Materiel participant Baleines invalide' using errcode='22023';
    end if;
    if v_type='mise_eau' then v_participant_mise:=v_participant_mise+1;
    elsif v_type='observateur' then v_participant_observateur:=v_participant_observateur+1;
    elsif v_type='enfant_moins_12' then v_participant_enfant_12:=v_participant_enfant_12+1;
    else v_participant_enfant_5:=v_participant_enfant_5+1;
    end if;
  end loop;
  if v_participant_mise<>coalesce((v_right.composition->>'mise_eau')::integer,0)
    or v_participant_observateur<>coalesce((v_right.composition->>'observateur')::integer,0)
    or v_participant_enfant_12<>coalesce((v_right.composition->>'enfant_moins_12')::integer,0)
    or v_participant_enfant_5<>coalesce((v_right.composition->>'enfant_moins_5')::integer,0)
    or (v_right.offer_code='baleines_5_plus_1' and (v_participant_mise<>6 or v_obs<>0)) then
    raise exception 'Composition Baleines modifiee' using errcode='22023';
  end if;
  v_slot:=case when p_depart='07:00' then 'morning' else 'afternoon' end;
  perform pg_advisory_xact_lock(hashtextextended('boat_calendar_slots:'||p_date_sortie::text||':'||v_slot,0));
  select coalesce(sum(nombre_mise_eau),0),coalesce(sum(nombre_observateurs),0) into v_used_mise,v_used_obs from public.reservations_baleines where date_sortie=p_date_sortie and depart=p_depart and (paye=true or statut_paiement in ('paid','paye','deposit_paid'));
  if v_used_mise+v_mise>6 or v_used_obs+v_obs>2 then raise exception 'Capacite Baleines insuffisante' using errcode='P0001'; end if;
  if exists(select 1 from public.boat_calendar_slots where date=p_date_sortie and slot=v_slot and status<>'available' and activity is distinct from 'baleines') then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
  insert into public.reservations_baleines(date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,participants,nombre_mise_eau,nombre_observateurs,montant_total,devise,statut_paiement,paye,source_paiement,paid_at)
  values(p_date_sortie,p_depart,v_sale.client_prenom,v_sale.client_nom,v_sale.client_email,v_sale.client_telephone,p_participants,v_mise,v_obs,v_sale.montant_total,'XPF',case when v_sale.montant_solde>0 then 'deposit_paid' else 'paid' end,true,'salon_admin',now()) returning id into v_res;
  insert into public.boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at) values(p_date_sortie,v_slot,'reserved','baleines',v_res,'reservations_baleines',null)
  on conflict(date,slot) do update set status='reserved',activity='baleines',reservation_id=v_res,reservation_table='reservations_baleines',expires_at=null where boat_calendar_slots.status='available' or boat_calendar_slots.activity='baleines' returning id into v_calendar;
  if v_calendar is null then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
  update public.salon_baleines_rights set status='redeemed',reservation_id=v_res,redeemed_at=now() where id=p_right_id;
  update public.salon_sale_items set reservation_type='reservations_baleines',reservation_id=v_res::text,status='redeemed' where id=v_item.id;
  return v_res;
end;
$$;

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
  values(p_date_sortie,case when v_right.formule='full_day' then 'full_day' else p_depart end,v_slots,v_right.nombre_personnes,v_sale.client_prenom,v_sale.client_nom,coalesce(v_sale.client_email,''),v_sale.client_telephone,v_sale.montant_total,v_sale.montant_encaisse,case when v_sale.montant_solde>0 then 'deposit' else 'full' end,case when v_sale.montant_solde>0 then 'deposit_paid' else 'paid' end,true,'salon_admin') returning id into v_res;
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

create or replace function public.redeem_salon_charter_right(p_right_id uuid,p_date_debut date,p_requested_slots jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_right public.salon_charter_rights%rowtype; v_item public.salon_sale_items%rowtype; v_sale public.salon_sales%rowtype; v_manual record; v_res uuid;
begin
  select * into v_right from public.salon_charter_rights where id=p_right_id for update;
  if not found or v_right.status<>'unused' then raise exception 'Droit Charter indisponible' using errcode='P0001'; end if;
  select * into v_item from public.salon_sale_items where id=v_right.sale_item_id for update;
  select * into v_sale from public.salon_sales where id=v_item.sale_id for update;
  if p_date_debut<current_date or p_date_debut+1>v_right.valid_until then raise exception 'Date Charter hors validite' using errcode='22023'; end if;
  select * into v_manual from public.create_manual_charter_reservation(p_date_debut,p_date_debut+1,'tetiaroa_2j_1n',v_right.nombre_personnes,v_sale.client_prenom,v_sale.client_nom,v_sale.client_email,v_sale.client_telephone,v_sale.montant_total,v_sale.montant_encaisse,v_sale.montant_solde,case v_sale.payment_method when 'tpe' then 'card_terminal' when 'especes' then 'cash' when 'cheque' then 'check' else 'bank_transfer' end,case when v_sale.montant_solde>0 then 'deposit_paid' else 'paid' end,null,false,v_right.sleeping_arrangement_accepted,p_requested_slots);
  if not coalesce(v_manual.success,false) then raise exception 'Conflit calendrier Charter' using errcode='P0001'; end if;
  v_res:=v_manual.reservation_id;
  update public.salon_charter_rights set status='redeemed',reservation_id=v_res,redeemed_at=now() where id=p_right_id;
  update public.salon_sale_items set reservation_type='reservations_charter',reservation_id=v_res::text,status='redeemed' where id=v_item.id;
  return v_res;
end;
$$;

revoke all on function public.redeem_salon_baleines_right(uuid,date,text,jsonb) from public;
revoke all on function public.redeem_salon_peche_right(uuid,date,text) from public;
revoke all on function public.redeem_salon_charter_right(uuid,date,jsonb) from public;
grant execute on function public.redeem_salon_baleines_right(uuid,date,text,jsonb) to service_role;
grant execute on function public.redeem_salon_peche_right(uuid,date,text) to service_role;
grant execute on function public.redeem_salon_charter_right(uuid,date,jsonb) to service_role;

create or replace function public.protect_redeemed_salon_reservation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (tg_table_name='reservations_baleines' and exists(select 1 from public.salon_baleines_rights where reservation_id=old.id and status='redeemed'))
    or (tg_table_name='reservations_peche' and exists(select 1 from public.salon_peche_rights where reservation_id=old.id and status='redeemed'))
    or (tg_table_name='reservations_charter' and exists(select 1 from public.salon_charter_rights where reservation_id=old.id and status='redeemed')) then
    raise exception 'Une reservation issue d un droit Salon doit etre annulee ou replanifiee explicitement' using errcode='P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_redeemed_salon_baleines on public.reservations_baleines;
drop trigger if exists protect_redeemed_salon_peche on public.reservations_peche;
drop trigger if exists protect_redeemed_salon_charter on public.reservations_charter;
create trigger protect_redeemed_salon_baleines before delete on public.reservations_baleines for each row execute function public.protect_redeemed_salon_reservation();
create trigger protect_redeemed_salon_peche before delete on public.reservations_peche for each row execute function public.protect_redeemed_salon_reservation();
create trigger protect_redeemed_salon_charter before delete on public.reservations_charter for each row execute function public.protect_redeemed_salon_reservation();
