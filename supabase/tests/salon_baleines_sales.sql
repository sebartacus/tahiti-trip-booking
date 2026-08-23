begin;

do $$
declare
  v_sale uuid; v_item uuid; v_reservation uuid; v_right uuid; v_total integer; v_count integer;
begin
  select sale_id,item_id,reservation_id,right_id into v_sale,v_item,v_reservation,v_right
  from public.create_salon_baleines_sale(
    'baleines_5_plus_1','Offre Salon 5+1 — 6 mises à l eau',
    '{"mise_eau":6,"observateur":0,"enfant_moins_12":0,"enfant_moins_5":0}'::jsonb,
    62500,'2026-11-20','Test','Groupe','87000000','','tpe','','','2026-10-10','07:00',
    '[{"role":"mise_eau"},{"role":"mise_eau"},{"role":"mise_eau"},{"role":"mise_eau"},{"role":"mise_eau"},{"role":"mise_eau"}]'::jsonb
  );
  select montant_total into v_total from public.salon_sales where id=v_sale;
  if v_total<>62500 then raise exception 'TTC 5+1 incorrect'; end if;
  if (select valid_until from public.salon_sale_items where id=v_item) <> '2026-11-20' then raise exception 'Validité 5+1 incorrecte'; end if;
  select nombre_mise_eau into v_count from public.reservations_baleines where id=v_reservation;
  if v_count<>6 then raise exception 'Le 5+1 ne réserve pas 6 mises à l eau'; end if;
  if not exists(select 1 from public.boat_calendar_slots where date='2026-10-10' and slot='morning' and activity='baleines' and status='reserved') then raise exception 'Calendrier Baleines non réservé'; end if;

  select sale_id,item_id,reservation_id,right_id into v_sale,v_item,v_reservation,v_right
  from public.create_salon_baleines_sale(
    'baleines_individuel','2 mises à l eau · 1 observateur · 1 enfant',
    '{"mise_eau":2,"observateur":1,"enfant_moins_12":1,"enfant_moins_5":0}'::jsonb,
    40500,'2026-11-20','Test','Composition','87000000','','especes','','',null,null,'[]'::jsonb
  );
  if v_reservation is not null or v_right is null then raise exception 'Le droit sans date est invalide'; end if;
  if exists(select 1 from public.boat_calendar_slots where reservation_id=v_right) then raise exception 'Un droit sans date bloque le calendrier'; end if;
  if (select valid_until from public.salon_sale_items where id=v_item) <> '2026-11-20' then raise exception 'Validité du droit Baleines incorrecte'; end if;
  if (select valid_until from public.salon_baleines_rights where id=v_right) <> '2026-11-20' then raise exception 'Snapshot de validité du droit incorrect'; end if;

  update public.salon_baleines_rights set status='redeemed' where id=v_right;
  begin
    perform public.admin_delete_salon_baleines_item(v_sale,v_item);
    raise exception 'Un droit consommé a été supprimé';
  exception when raise_exception then
    if sqlerrm not like '%déjà été utilisé%' then raise; end if;
  end;
end;
$$;

rollback;
