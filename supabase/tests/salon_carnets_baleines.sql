begin;
do $$
declare v_result record; v_method text; v_credits integer; v_amount integer; v_count integer;
begin
  foreach v_method in array array['tpe', 'especes', 'cheque', 'virement'] loop
    v_credits := case when v_method in ('tpe', 'cheque') then 5 else 10 end;
    v_amount := case when v_credits = 5 then 55000 else 100000 end;
    select * into v_result from public.create_salon_carnet_baleines_sale(
      case when v_credits = 5 then 'carnet_baleines_5' else 'carnet_baleines_10' end,
      'Carnet Baleines ' || v_credits || ' sorties', v_credits, v_amount,
      case when v_credits = 5 then 65000 else 115000 end, '2027-11-20',
      'Test', v_method, '87 00 00 00', null, v_method,
      case when v_method in ('cheque', 'virement') then 'REF-TEST' else null end, null
    );
    select count(*) into v_count from public.carnets_baleines c
      join public.salon_sale_items i on i.reservation_id = c.id::text
      where c.id = v_result.carnet_id and i.id = v_result.item_id
        and c.credits_initiaux = v_credits and c.credits_restants = v_credits
        and c.montant_encaisse = v_amount and c.date_expiration = '2027-11-20'
        and c.origine_creation = 'salon' and i.activity = 'carnet_baleines'
        and i.unit_price = v_amount and i.total_price = v_amount;
    if v_count <> 1 then raise exception 'Création carnet Salon incorrecte pour %', v_method; end if;
  end loop;
  select count(*) into v_count from public.salon_sales
    where client_prenom = 'Test' and (facture_url is not null or facture_envoyee_at is not null);
  if v_count <> 0 then raise exception 'Le RPC ne doit ni générer ni envoyer de facture'; end if;
end;
$$;
rollback;
