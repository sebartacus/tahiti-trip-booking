begin;

do $$
declare
  v_result record;
  v_method text;
  v_price integer;
  v_count integer;
begin
  foreach v_method in array array['tpe', 'especes', 'cheque', 'virement'] loop
    select * into v_result from public.create_salon_permis_sale(
      'permis_classique', 'Classique', 'Permis côtier – Classique', 20900, '2027-01-31',
      'Client', v_method, '87 00 00 00', null, v_method,
      case when v_method in ('cheque', 'virement') then 'REF-TEST' else null end,
      'Test automatique', 'Plus tard', true, '', '', ''
    );
    if v_result.sale_id is null or v_result.item_id is null or v_result.reservation_id is null then
      raise exception 'Création plus tard échouée pour %', v_method;
    end if;
    select unit_price into v_price from public.salon_sale_items where id = v_result.item_id;
    if v_price <> 20900 then raise exception 'Snapshot Classique incorrect'; end if;
    select count(*) into v_count from public.salon_sale_items
      where id = v_result.item_id and reservation_type = 'reservations'
        and reservation_id = v_result.reservation_id and valid_until = '2027-01-31';
    if v_count <> 1 then raise exception 'Lien réservation ou validité incorrect'; end if;
  end loop;

  select * into v_result from public.create_salon_permis_sale(
    'permis_serenite', 'Sérénité', 'Permis côtier – Sérénité', 28900, '2027-01-31',
    'Client', 'Avec dates', '87 00 00 01', 'dates@example.com', 'tpe', null, null,
    '02/01/2100', false, '31/12/2099', 'individuel', '07h00 - 09h00'
  );
  select unit_price into v_price from public.salon_sale_items where id = v_result.item_id;
  if v_price <> 28900 then raise exception 'Snapshot Sérénité incorrect'; end if;
  select count(*) into v_count from public.reservations
    where id::text = v_result.reservation_id and date_cours = '31/12/2099'
      and creneau = '07h00 - 09h00' and pricing_type = 'salon_tourisme'
      and origine_reservation = 'salon' and pricing_amount = 28900;
  if v_count <> 1 then raise exception 'Création avec dates incorrecte'; end if;

  select count(*) into v_count from public.salon_sales
    where client_prenom = 'Client' and (facture_url is not null or facture_envoyee_at is not null);
  if v_count <> 0 then raise exception 'Le RPC ne doit ni générer ni envoyer la facture'; end if;
end;
$$;

rollback;
