begin;

do $$
declare
  v_sale uuid; v_item uuid; v_right uuid; v_res uuid; v_total integer; v_paid integer; v_balance integer;
  v_code text; v_price integer; v_people integer; v_date date; v_formula text; v_slots jsonb; v_payment_type text;
  v_failed boolean; v_before jsonb; v_after jsonb; v_reservations_before bigint; v_calendar_before bigint;
  v_one jsonb := '[{"prenom":"Solo","nom":"Test","age":"30","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""}]';
  v_three jsonb := '[{"prenom":"Mia","nom":"Test","age":"32","role":"mise_eau","type":"mise_eau","materielPerso":false,"tailleCombinaison":"M","pointurePalmes":"39"},{"prenom":"Noa","nom":"Test","age":"28","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"Tea","nom":"Test","age":"40","role":"observateur","type":"observateur","materielPerso":false,"tailleCombinaison":"","pointurePalmes":""}]';
  v_six jsonb := '[{"prenom":"A1","nom":"Test","age":"20","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"A2","nom":"Test","age":"21","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"A3","nom":"Test","age":"22","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"A4","nom":"Test","age":"23","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"A5","nom":"Test","age":"24","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"A6","nom":"Test","age":"25","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""}]';
begin
  if to_regprocedure('public.redeem_salon_baleines_right(uuid,date,text,jsonb)') is null
    or to_regprocedure('public.redeem_salon_peche_right(uuid,date,text)') is null
    or to_regprocedure('public.redeem_salon_charter_right(uuid,date,jsonb)') is null then
    raise exception 'RPC de redemption Salon manquante';
  end if;

  delete from public.boat_calendar_slots where date between date '2026-10-05' and date '2027-02-02';

  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_individuel','2 mises a l eau + 1 observateur','{"mise_eau":2,"observateur":1,"enfant_moins_12":0,"enfant_moins_5":0}',33500,date '2026-11-20',
    'Rose','Boulay','87000000','','tpe','','',null,null,'[]','deposit');
  update public.salon_sales set facture_numero='SALON-TEST-001',facture_url='salon/test-001.pdf',facture_generee_at='2026-08-26 10:00:00+00',facture_envoyee_at='2026-08-26 11:00:00+00' where id=v_sale;
  select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
  v_res:=public.redeem_salon_baleines_right(v_right,date '2026-10-05','07:00',v_three);
  select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
  if (select nombre_mise_eau from public.reservations_baleines where id=v_res)<>2 or (select nombre_observateurs from public.reservations_baleines where id=v_res)<>1 then raise exception 'Composition Baleines modifiee'; end if;
  if (select reservation_id from public.salon_baleines_rights where id=v_right)<>v_res or (select status from public.salon_baleines_rights where id=v_right)<>'redeemed' then raise exception 'Lien redemption Baleines incorrect'; end if;
  if v_after is distinct from v_before then raise exception 'Vente, paiement ou facture Baleines modifie'; end if;
  v_failed:=false; begin perform public.redeem_salon_baleines_right(v_right,date '2026-10-06','07:00',v_three); exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'Double redemption Baleines acceptee'; end if;

  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_5_plus_1','Offre Salon 5+1','{"mise_eau":6,"observateur":0,"enfant_moins_12":0,"enfant_moins_5":0}',62500,date '2026-11-20',
    'A','B','1','','tpe','','',null,null,'[]','full');
  select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
  v_res:=public.redeem_salon_baleines_right(v_right,date '2026-10-06','13:15',v_six);
  select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
  if (select nombre_mise_eau from public.reservations_baleines where id=v_res)<>6 then raise exception 'Le 5+1 ne reserve pas 6 mises a l eau'; end if;
  if v_after is distinct from v_before then raise exception 'Vente ou paiement integral Baleines modifie'; end if;
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_5_plus_1','Offre Salon 5+1','{"mise_eau":6,"observateur":0,"enfant_moins_12":0,"enfant_moins_5":0}',62500,date '2026-11-20','Expire','Baleines','1','','tpe','','',null,null,'[]','full');
  v_failed:=false; begin perform public.redeem_salon_baleines_right(v_right,date '2026-11-21','13:15',v_six); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_baleines_rights where id=v_right)<>'unused' then raise exception 'Date Baleines expiree acceptee'; end if;

  -- La RPC doit refuser une composition 1 mise à l'eau + 2 observateurs pour un droit 2+1.
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_individuel','2 mises a l eau + 1 observateur','{"mise_eau":2,"observateur":1,"enfant_moins_12":0,"enfant_moins_5":0}',33500,date '2026-11-20','Composition','Baleines','1','','tpe','','',null,null,'[]','full');
  select count(*) into v_reservations_before from public.reservations_baleines;
  select count(*) into v_calendar_before from public.boat_calendar_slots;
  v_failed:=false; begin perform public.redeem_salon_baleines_right(v_right,date '2026-10-07','07:00',
    '[{"prenom":"A","nom":"T","age":"20","role":"mise_eau","type":"mise_eau","materielPerso":true,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"B","nom":"T","age":"20","role":"observateur","type":"observateur","materielPerso":false,"tailleCombinaison":"","pointurePalmes":""},{"prenom":"C","nom":"T","age":"20","role":"observateur","type":"observateur","materielPerso":false,"tailleCombinaison":"","pointurePalmes":""}]'); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_baleines_rights where id=v_right)<>'unused'
    or not exists(select 1 from public.salon_sale_items where id=v_item and reservation_type='salon_baleines_rights' and reservation_id=v_right::text)
    or (select count(*) from public.reservations_baleines)<>v_reservations_before
    or (select count(*) from public.boat_calendar_slots)<>v_calendar_before then raise exception 'Composition Baleines alteree acceptee ou rollback incomplet'; end if;

  -- Une sortie 5+1 remplit la capacité ; une mise à l'eau supplémentaire doit échouer.
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_individuel','Une mise a l eau','{"mise_eau":1,"observateur":0,"enfant_moins_12":0,"enfant_moins_5":0}',15000,date '2026-11-20','Capacite','Baleines','1','','tpe','','',null,null,'[]','full');
  v_failed:=false; begin perform public.redeem_salon_baleines_right(v_right,date '2026-10-06','13:15',v_one); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_baleines_rights where id=v_right)<>'unused' then raise exception 'Capacite Baleines insuffisante acceptee'; end if;

  for v_code,v_price,v_people,v_date,v_payment_type in values
    ('peche_privatisation_demi_journee',79000,4,date '2026-12-10','full'),
    ('peche_privatisation_journee',110000,4,date '2026-12-11','deposit'),
    ('peche_2_plus_1_demi_journee',66000,3,date '2026-12-12','full'),
    ('peche_2_plus_1_journee',80000,3,date '2026-12-13','deposit')
  loop
    select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_peche_sale_with_payment(v_code,v_price,'A','B','1','','tpe','','',v_people,null,null,v_payment_type);
    update public.salon_sales set facture_numero='PECHE-'||v_date::text,facture_url='salon/'||v_date::text||'.pdf' where id=v_sale;
    select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
    select formule into v_formula from public.salon_peche_rights where id=v_right;
    v_res:=public.redeem_salon_peche_right(v_right,v_date,'morning');
    select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
    if (select nombre_personnes from public.reservations_peche where id=v_res)<>v_people then raise exception 'Participants Peche modifies'; end if;
    if v_formula='full_day' and (select cardinality(slots) from public.reservations_peche where id=v_res)<>2 then raise exception 'Journee Peche incomplete'; end if;
    if v_after is distinct from v_before then raise exception 'Vente, paiement ou facture Peche modifie'; end if;
  end loop;
  v_failed:=false; begin perform public.redeem_salon_peche_right(v_right,date '2026-12-14','morning'); exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'Double redemption Peche acceptee'; end if;
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_peche_sale_with_payment('peche_privatisation_demi_journee',79000,'Expire','Peche','1','','tpe','','',4,null,null,'full');
  v_failed:=false; begin perform public.redeem_salon_peche_right(v_right,date '2027-02-01','morning'); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_peche_rights where id=v_right)<>'unused' then raise exception 'Date Peche expiree acceptee'; end if;

  -- Conflit interactivité : Pêche réserve le matin, Baleines ne peut pas prendre le même bateau/créneau.
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_peche_sale_with_payment('peche_privatisation_demi_journee',79000,'Inter','Peche','1','','tpe','','',4,null,null,'full');
  v_res:=public.redeem_salon_peche_right(v_right,date '2026-10-09','morning');
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_baleines_sale_with_payment(
    'baleines_individuel','Une mise a l eau','{"mise_eau":1,"observateur":0,"enfant_moins_12":0,"enfant_moins_5":0}',15000,date '2026-11-20','Inter','Baleines','1','','tpe','','',null,null,'[]','full');
  select count(*) into v_reservations_before from public.reservations_baleines;
  v_failed:=false; begin perform public.redeem_salon_baleines_right(v_right,date '2026-10-09','07:00',v_one); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_baleines_rights where id=v_right)<>'unused'
    or (select count(*) from public.reservations_baleines)<>v_reservations_before
    or not exists(select 1 from public.boat_calendar_slots where date=date '2026-10-09' and slot='morning' and activity='peche' and reservation_id=v_res) then raise exception 'Conflit interactivite accepte ou rollback incomplet'; end if;

  -- Conflit bateau Pêche explicite.
  insert into public.boat_calendar_slots(date,slot,status) values(date '2026-12-20','morning','blocked');
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_peche_sale_with_payment('peche_privatisation_demi_journee',79000,'Conflit','Peche','1','','tpe','','',4,null,null,'full');
  v_failed:=false; begin perform public.redeem_salon_peche_right(v_right,date '2026-12-20','morning'); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_peche_rights where id=v_right)<>'unused' then raise exception 'Conflit bateau Peche accepte'; end if;

  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_charter_sale_with_payment('charter_tetiaroa_2j_1n',290000,'A','B','1','',2,false,'tpe','','',null,'[]','deposit');
  update public.salon_sales set facture_numero='CHARTER-TEST-001',facture_url='salon/charter-test.pdf',facture_generee_at='2026-08-26 10:00:00+00',facture_envoyee_at='2026-08-26 11:00:00+00' where id=v_sale;
  select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
  v_slots:='[{"date":"2026-12-15","slot":"morning"},{"date":"2026-12-15","slot":"afternoon"},{"date":"2026-12-16","slot":"morning"},{"date":"2026-12-16","slot":"afternoon"}]';
  v_res:=public.redeem_salon_charter_right(v_right,date '2026-12-15',v_slots);
  select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
  if (select count(*) from public.boat_calendar_slots where reservation_id=v_res)<>4 then raise exception 'Charter ne bloque pas quatre creneaux'; end if;
  if v_after is distinct from v_before then raise exception 'Vente, paiement ou facture Charter modifie'; end if;
  v_failed:=false; begin perform public.redeem_salon_charter_right(v_right,date '2026-12-17',v_slots); exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'Double redemption Charter acceptee'; end if;

  -- Un seul créneau Charter en conflit doit annuler toute la conversion.
  insert into public.boat_calendar_slots(date,slot,status) values(date '2026-12-22','afternoon','blocked');
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_charter_sale_with_payment('charter_tetiaroa_2j_1n',290000,'Charter','Conflit','1','',2,false,'cheque','','',null,'[]','full');
  update public.salon_sales set facture_numero='CHARTER-TEST-002',facture_url='salon/charter-test-2.pdf' where id=v_sale;
  select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
  select count(*) into v_reservations_before from public.reservations_charter;
  select count(*) into v_calendar_before from public.boat_calendar_slots;
  v_slots:='[{"date":"2026-12-21","slot":"morning"},{"date":"2026-12-21","slot":"afternoon"},{"date":"2026-12-22","slot":"morning"},{"date":"2026-12-22","slot":"afternoon"}]';
  v_failed:=false; begin perform public.redeem_salon_charter_right(v_right,date '2026-12-21',v_slots); exception when others then v_failed:=true; end;
  select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
  if not v_failed or v_after is distinct from v_before or (select status from public.salon_charter_rights where id=v_right)<>'unused'
    or (select reservation_id from public.salon_charter_rights where id=v_right) is not null
    or not exists(select 1 from public.salon_sale_items where id=v_item and reservation_type='salon_charter_rights' and reservation_id=v_right::text)
    or (select count(*) from public.reservations_charter)<>v_reservations_before
    or (select count(*) from public.boat_calendar_slots)<>v_calendar_before then raise exception 'Rollback Charter incomplet'; end if;

  -- Charter intégral : succès sans création d'une seconde réservation ni mutation de la vente.
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_charter_sale_with_payment('charter_tetiaroa_2j_1n',290000,'Charter','Integral','1','',2,false,'especes','','',null,'[]','full');
  select to_jsonb(s) into v_before from public.salon_sales s where id=v_sale;
  v_slots:='[{"date":"2026-12-25","slot":"morning"},{"date":"2026-12-25","slot":"afternoon"},{"date":"2026-12-26","slot":"morning"},{"date":"2026-12-26","slot":"afternoon"}]';
  v_reservations_before:=(select count(*) from public.reservations_charter);
  v_res:=public.redeem_salon_charter_right(v_right,date '2026-12-25',v_slots);
  select to_jsonb(s) into v_after from public.salon_sales s where id=v_sale;
  if v_after is distinct from v_before or (select count(*) from public.reservations_charter)<>v_reservations_before+1
    or (select count(*) from public.reservations_charter where id=v_res)<>1 then raise exception 'Redemption Charter integral incorrecte'; end if;

  -- Le séjour Charter complet doit rester avant ou au 31 janvier 2027.
  select sale_id,item_id,right_id into v_sale,v_item,v_right from public.create_salon_charter_sale_with_payment('charter_tetiaroa_2j_1n',290000,'Charter','Expire','1','',2,false,'virement','','',null,'[]','full');
  v_slots:='[{"date":"2027-01-31","slot":"morning"},{"date":"2027-01-31","slot":"afternoon"},{"date":"2027-02-01","slot":"morning"},{"date":"2027-02-01","slot":"afternoon"}]';
  v_failed:=false; begin perform public.redeem_salon_charter_right(v_right,date '2027-01-31',v_slots); exception when others then v_failed:=true; end;
  if not v_failed or (select status from public.salon_charter_rights where id=v_right)<>'unused'
    or not exists(select 1 from public.salon_sale_items where id=v_item and reservation_type='salon_charter_rights' and reservation_id=v_right::text) then raise exception 'Date Charter expiree acceptee'; end if;
end $$;

rollback;
