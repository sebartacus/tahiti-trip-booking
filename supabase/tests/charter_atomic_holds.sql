begin;

do $$
declare
  v_reservation_a uuid;
  v_reservation_b uuid;
  v_reservation_c uuid;
  v_reservation_d1 uuid;
  v_reservation_d2 uuid;
  v_reservation_e1 uuid;
  v_reservation_e2 uuid;
  v_reservation_f_old uuid;
  v_reservation_f_new uuid;
  v_reservation_g uuid;
  v_reservation_h_owner uuid;
  v_reservation_h_candidate uuid;
  v_result record;
  v_count integer;
begin
  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values
    ('2099-01-10', '2099-01-11', 'tetiaroa_2j_1n', 2,
     'Test', 'A', 'test-a@example.com', '00000000',
     310000, 93000, 'deposit', 'pending', false)
  returning id into v_reservation_a;

  -- A. Les quatre slots libres sont acquis ensemble.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_a,
    'reservations_charter',
    'charter',
    '[
      {"date":"2099-01-10","slot":"morning"},
      {"date":"2099-01-10","slot":"afternoon"},
      {"date":"2099-01-11","slot":"morning"},
      {"date":"2099-01-11","slot":"afternoon"}
    ]'::jsonb
  );

  if not v_result.success or jsonb_array_length(v_result.acquired_slots) <> 4 then
    raise exception 'Test A echoue: les quatre slots n ont pas ete acquis';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values
    ('2099-01-20', '2099-01-21', 'tetiaroa_2j_1n', 2,
     'Test', 'B', 'test-b@example.com', '00000000',
     310000, 310000, 'full', 'pending', false)
  returning id into v_reservation_b;

  insert into public.boat_calendar_slots (
    date, slot, status, blocked_reason, blocked_by, blocked_at
  ) values (
    '2099-01-21', 'afternoon', 'blocked', 'Test B', 'test', now()
  );

  -- B. Un conflit sur un seul des quatre slots refuse tout le lot.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_b,
    'reservations_charter',
    'charter',
    '[
      {"date":"2099-01-20","slot":"morning"},
      {"date":"2099-01-20","slot":"afternoon"},
      {"date":"2099-01-21","slot":"morning"},
      {"date":"2099-01-21","slot":"afternoon"}
    ]'::jsonb
  );

  select count(*) into v_count
  from public.boat_calendar_slots
  where reservation_id = v_reservation_b;

  if v_result.success or jsonb_array_length(v_result.conflicts) <> 1 or v_count <> 0 then
    raise exception 'Test B echoue: refus incomplet ou hold partiel cree';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values
    ('2099-02-01', '2099-02-03', 'tetiaroa_3j_2n', 4,
     'Test', 'C', 'test-c@example.com', '00000000',
     429000, 128700, 'deposit', 'pending', false)
  returning id into v_reservation_c;

  -- C. Les six slots libres sont acquis ensemble.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_c,
    'reservations_charter',
    'charter',
    '[
      {"date":"2099-02-01","slot":"morning"},
      {"date":"2099-02-01","slot":"afternoon"},
      {"date":"2099-02-02","slot":"morning"},
      {"date":"2099-02-02","slot":"afternoon"},
      {"date":"2099-02-03","slot":"morning"},
      {"date":"2099-02-03","slot":"afternoon"}
    ]'::jsonb
  );

  if not v_result.success or jsonb_array_length(v_result.acquired_slots) <> 6 then
    raise exception 'Test C echoue: les six slots n ont pas ete acquis';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-01', '2099-03-01', 'sunset', 2,
    'Test', 'D1', 'test-d1@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_d1;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-01', '2099-03-01', 'sunset', 2,
    'Test', 'D2', 'test-d2@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_d2;

  perform public.acquire_charter_boat_holds(
    v_reservation_d1,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-01","slot":"afternoon"}]'::jsonb
  );

  -- D. La seconde tentative sur le meme Sunset est refusee. Le verrou
  -- consultatif transactionnel garantit le meme resultat si les appels sont concurrents.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_d2,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-01","slot":"afternoon"}]'::jsonb
  );

  if v_result.success then
    raise exception 'Test D echoue: deux reservations ont acquis le Sunset';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-02', '2099-03-02', 'sunset', 2,
    'Test', 'E1', 'test-e1@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_e1;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-02', '2099-03-02', 'sunset', 2,
    'Test', 'E2', 'test-e2@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_e2;

  perform public.acquire_charter_boat_holds(
    v_reservation_e1,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-02","slot":"afternoon"}]'::jsonb,
    now() + interval '30 minutes'
  );

  -- E. Un hold pending mais non expire reste protege.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_e2,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-02","slot":"afternoon"}]'::jsonb
  );

  if v_result.success then
    raise exception 'Test E echoue: un hold actif non paye a ete repris';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-03', '2099-03-03', 'sunset', 2,
    'Test', 'F ancien', 'test-f-old@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_f_old;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-03', '2099-03-03', 'sunset', 2,
    'Test', 'F nouveau', 'test-f-new@example.com', '00000000',
    75000, 22500, 'deposit', 'pending', false
  )
  returning id into v_reservation_f_new;

  insert into public.boat_calendar_slots (
    date, slot, status, activity, reservation_id, reservation_table, expires_at
  ) values (
    '2099-03-03', 'afternoon', 'hold', 'charter',
    v_reservation_f_old, 'reservations_charter', now() - interval '1 minute'
  );

  -- F. Un hold expire peut etre repris.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_f_new,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-03","slot":"afternoon"}]'::jsonb
  );

  if not v_result.success then
    raise exception 'Test F echoue: le hold expire n a pas ete repris';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values
    ('2099-03-04', '2099-03-04', 'moorea_matin', 2,
     'Test', 'G', 'test-g@example.com', '00000000',
     95000, 95000, 'full', 'pending', false)
  returning id into v_reservation_g;

  insert into public.boat_calendar_slots (
    date, slot, status, blocked_reason, blocked_by, blocked_at
  ) values (
    '2099-03-04', 'morning', 'blocked', 'Test G', 'test', now()
  );

  -- G. Un slot bloque ne peut pas etre acquis.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_g,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-04","slot":"morning"}]'::jsonb
  );

  if v_result.success then
    raise exception 'Test G echoue: un slot bloque a ete acquis';
  end if;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-05', '2099-03-05', 'moorea_matin', 2,
    'Test', 'H proprietaire', 'test-h-owner@example.com', '00000000',
    95000, 95000, 'full', 'paid', true
  )
  returning id into v_reservation_h_owner;

  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, type_paiement, statut_paiement, paye
  ) values (
    '2099-03-05', '2099-03-05', 'moorea_matin', 2,
    'Test', 'H candidat', 'test-h-candidate@example.com', '00000000',
    95000, 95000, 'full', 'pending', false
  )
  returning id into v_reservation_h_candidate;

  insert into public.boat_calendar_slots (
    date, slot, status, activity, reservation_id, reservation_table
  ) values (
    '2099-03-05', 'morning', 'reserved', 'charter',
    v_reservation_h_owner, 'reservations_charter'
  );

  -- H. Un slot reserve ne peut pas etre acquis.
  select * into v_result
  from public.acquire_charter_boat_holds(
    v_reservation_h_candidate,
    'reservations_charter',
    'charter',
    '[{"date":"2099-03-05","slot":"morning"}]'::jsonb
  );

  if v_result.success then
    raise exception 'Test H echoue: un slot reserve a ete acquis';
  end if;
end;
$$;

rollback;
