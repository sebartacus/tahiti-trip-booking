begin;

do $$
declare
  v_reservation uuid;
  v_result record;
  v_slot_count integer;
begin
  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, montant_solde, type_paiement,
    conditions_accepted
  ) values (
    date '2098-01-10', date '2098-01-11', 'tetiaroa_2j_1n', 2,
    'Test', 'Acompte', 'test@example.com', '87000000',
    310000, 93000, 217000, 'deposit', true
  ) returning id into v_reservation;

  perform * from public.acquire_charter_boat_holds(
    v_reservation, 'reservations_charter', 'charter',
    '[{"date":"2098-01-10","slot":"morning"},{"date":"2098-01-10","slot":"afternoon"},{"date":"2098-01-11","slot":"morning"},{"date":"2098-01-11","slot":"afternoon"}]'::jsonb,
    now() + interval '30 minutes'
  );

  select * into v_result from public.confirm_charter_payment(v_reservation, 'test-deposit', 93000, now());
  if not v_result.success or v_result.confirmed_slots <> 4 then
    raise exception 'Echec confirmation atomique des 4 slots';
  end if;

  select count(*) into v_slot_count from public.boat_calendar_slots
  where reservation_id = v_reservation and status = 'reserved';
  if v_slot_count <> 4 then raise exception 'Les 4 slots ne sont pas reserves'; end if;

  select * into v_result from public.confirm_charter_payment(v_reservation, 'test-deposit', 93000, now());
  if not v_result.success or not v_result.already_processed then
    raise exception 'La confirmation repetee doit etre idempotente';
  end if;
end;
$$;

do $$
declare
  v_reservation uuid;
  v_result record;
begin
  insert into public.reservations_charter (
    date_debut, date_fin, formule, nombre_personnes,
    responsable_prenom, responsable_nom, responsable_email, responsable_tel,
    montant_total, montant_paye, montant_solde, type_paiement,
    conditions_accepted
  ) values (
    date '2098-02-10', date '2098-02-10', 'moorea_matin', 5,
    'Test', 'Expire', 'test@example.com', '87000000',
    100000, 100000, 0, 'full', true
  ) returning id into v_reservation;

  insert into public.boat_calendar_slots (
    date, slot, status, activity, reservation_id, reservation_table, expires_at
  ) values (
    date '2098-02-10', 'morning', 'hold', 'charter', v_reservation,
    'reservations_charter', now() - interval '1 second'
  ) on conflict (date, slot) do update set
    status = excluded.status, activity = excluded.activity,
    reservation_id = excluded.reservation_id,
    reservation_table = excluded.reservation_table, expires_at = excluded.expires_at;

  select * into v_result from public.confirm_charter_payment(v_reservation, 'test-expired', 100000, now());
  if v_result.success or v_result.error_code <> 'hold_expired_or_incomplete' then
    raise exception 'Un hold expire doit empecher la confirmation';
  end if;
end;
$$;

rollback;
