create or replace function public.create_salon_baleines_sale(
  p_offer_code text, p_label text, p_composition jsonb, p_total integer, p_valid_until date,
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
  if p_valid_until is null then
    raise exception 'Validite Baleines Salon requise' using errcode = '22023';
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
    select coalesce(sum(r.nombre_mise_eau), 0), coalesce(sum(r.nombre_observateurs), 0)
    into v_used_mise, v_used_observateurs
    from public.reservations_baleines r
    where r.date_sortie = p_date_sortie::text and r.depart = p_depart
      and (r.paye = true or r.statut_paiement in ('paid', 'paye', 'deposit_paid'));
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
    insert into public.salon_baleines_rights(sale_id, offer_code, label, composition, valid_until)
    values(v_sale_id, p_offer_code, p_label, p_composition, p_valid_until) returning id into v_right_id;
  else
    insert into public.reservations_baleines(date_sortie, depart, responsable_prenom, responsable_nom,
      responsable_email, responsable_telephone, participants, nombre_mise_eau, nombre_observateurs,
      montant_total, devise, statut_paiement, paye, source_paiement)
    values(p_date_sortie, p_depart, trim(p_prenom), trim(p_nom), nullif(trim(p_email), ''), trim(p_telephone),
      p_participants, v_mise, v_observateurs, p_total, 'XPF', 'paid', true, 'salon_admin')
    returning id into v_reservation_id;

    insert into public.boat_calendar_slots(date, slot, status, activity, reservation_id, reservation_table, expires_at)
    values(p_date_sortie, v_slot, 'reserved', 'baleines', v_reservation_id, 'reservations_baleines', null)
    on conflict(date, slot) do update set status = 'reserved', activity = 'baleines',
      reservation_id = v_reservation_id, reservation_table = 'reservations_baleines', expires_at = null
    where boat_calendar_slots.status = 'available' or boat_calendar_slots.activity = 'baleines'
    returning id into v_calendar_id;
    if v_calendar_id is null then raise exception 'Creneau bateau indisponible' using errcode = 'P0001'; end if;
  end if;

  insert into public.salon_sale_items(sale_id, activity, offer_code, libelle, quantity, unit_price,
    total_price, valid_until, status, reservation_type, reservation_id)
  values(v_sale_id, 'baleines', p_offer_code, p_label, 1, p_total, p_total, p_valid_until, 'reserved',
    case when v_reservation_id is null then 'salon_baleines_rights' else 'reservations_baleines' end,
    coalesce(v_reservation_id, v_right_id)::text)
  returning id into v_item_id;
  return query select v_sale_id, v_item_id, v_reservation_id, v_right_id;
end;
$$;

revoke all on function public.create_salon_baleines_sale(text,text,jsonb,integer,date,text,text,text,text,text,text,text,date,text,jsonb) from public;
grant execute on function public.create_salon_baleines_sale(text,text,jsonb,integer,date,text,text,text,text,text,text,text,date,text,jsonb) to service_role;

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
  select coalesce(sum(nombre_mise_eau),0),coalesce(sum(nombre_observateurs),0) into v_used_mise,v_used_obs
  from public.reservations_baleines
  where date_sortie=p_date_sortie::text and depart=p_depart
    and (paye=true or statut_paiement in ('paid','paye','deposit_paid'));
  if v_used_mise+v_mise>6 or v_used_obs+v_obs>2 then raise exception 'Capacite Baleines insuffisante' using errcode='P0001'; end if;
  if exists(select 1 from public.boat_calendar_slots where date=p_date_sortie and slot=v_slot and status<>'available' and activity is distinct from 'baleines') then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
  insert into public.reservations_baleines(date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,participants,nombre_mise_eau,nombre_observateurs,montant_total,devise,statut_paiement,paye,source_paiement)
  values(p_date_sortie,p_depart,v_sale.client_prenom,v_sale.client_nom,v_sale.client_email,v_sale.client_telephone,p_participants,v_mise,v_obs,v_sale.montant_total,'XPF',case when v_sale.montant_solde>0 then 'deposit_paid' else 'paid' end,true,'salon_admin') returning id into v_res;
  insert into public.boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at) values(p_date_sortie,v_slot,'reserved','baleines',v_res,'reservations_baleines',null)
  on conflict(date,slot) do update set status='reserved',activity='baleines',reservation_id=v_res,reservation_table='reservations_baleines',expires_at=null where boat_calendar_slots.status='available' or boat_calendar_slots.activity='baleines' returning id into v_calendar;
  if v_calendar is null then raise exception 'Creneau bateau indisponible' using errcode='P0001'; end if;
  update public.salon_baleines_rights set status='redeemed',reservation_id=v_res,redeemed_at=now() where id=p_right_id;
  update public.salon_sale_items set reservation_type='reservations_baleines',reservation_id=v_res::text,status='redeemed' where id=v_item.id;
  return v_res;
end;
$$;

revoke all on function public.redeem_salon_baleines_right(uuid,date,text,jsonb) from public;
grant execute on function public.redeem_salon_baleines_right(uuid,date,text,jsonb) to service_role;
