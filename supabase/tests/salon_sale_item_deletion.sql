begin;

do $$
declare
  v_sale uuid;
  v_permis_item uuid;
  v_carnet_item uuid;
  v_reservation bigint;
  v_carnet uuid;
  v_result jsonb;
begin
  select sale_id, item_id, reservation_id::bigint
  into v_sale, v_permis_item, v_reservation
  from public.create_salon_permis_sale(
    'permis_classique', 'Classique', 'Permis test', 20900, '2027-01-31',
    'Test', 'Suppression', '87000000', '', 'especes', '', '',
    'Plus tard', true, '', '', ''
  );

  v_result := public.admin_delete_salon_sale_item(v_sale, v_permis_item);
  if not (v_result->>'deleted')::boolean then raise exception 'Suppression Permis échouée'; end if;
  if exists(select 1 from public.reservations where id = v_reservation) then raise exception 'Réservation Permis orpheline'; end if;
  if exists(select 1 from public.salon_sales where id = v_sale) then raise exception 'Vente Salon orpheline'; end if;

  select sale_id, item_id, carnet_id
  into v_sale, v_carnet_item, v_carnet
  from public.create_salon_carnet_baleines_sale(
    'carnet_baleines_5', 'Carnet test', 5, 55000, 60000, '2027-11-20',
    'Test', 'Suppression', '87000000', '', 'tpe', '', ''
  );

  v_result := public.admin_delete_salon_sale_item(v_sale, v_carnet_item);
  if not (v_result->>'deleted')::boolean then raise exception 'Suppression carnet échouée'; end if;
  if exists(select 1 from public.carnets_baleines where id = v_carnet) then raise exception 'Carnet orphelin'; end if;
end;
$$;

rollback;
