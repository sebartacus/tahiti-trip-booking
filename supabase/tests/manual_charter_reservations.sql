begin;

do $$
declare
  v_case record;
  v_result record;
  v_slots jsonb;
  v_count integer;
  v_conflict_date date := '2099-12-20';
begin
  -- Les cinq formules creent exactement leurs slots reserves.
  for v_case in
    select * from (values
      ('tetiaroa_2j_1n', date '2099-11-01', date '2099-11-02', 4, 310000),
      ('tetiaroa_3j_2n', date '2099-11-05', date '2099-11-07', 6, 429000),
      ('moorea_matin', date '2099-11-10', date '2099-11-10', 1, 95000),
      ('moorea_journee', date '2099-11-12', date '2099-11-12', 2, 145000),
      ('sunset', date '2099-11-14', date '2099-11-14', 1, 75000)
    ) cases(formule, date_debut, date_fin, slot_count, total)
  loop
    select jsonb_agg(jsonb_build_object('date', day_value, 'slot', slot_value))
    into v_slots
    from generate_series(v_case.date_debut, v_case.date_fin, interval '1 day') days(day_value)
    cross join lateral (
      select slot_value from unnest(case
        when v_case.formule in ('moorea_matin') then array['morning']
        when v_case.formule in ('sunset') then array['afternoon']
        else array['morning', 'afternoon']
      end) slots(slot_value)
    ) required;

    select * into v_result from public.create_manual_charter_reservation(
      v_case.date_debut, v_case.date_fin, v_case.formule, 2,
      'Test', v_case.formule, null, '87 00 00 00',
      v_case.total, 0, v_case.total, 'cash', 'unpaid',
      case when v_case.formule = 'sunset' then 'white_wine' else null end,
      false, false, v_slots
    );

    select count(*) into v_count from public.boat_calendar_slots
    where reservation_id = v_result.reservation_id and status = 'reserved'
      and activity = 'charter';
    if not v_result.success or v_count <> v_case.slot_count then
      raise exception 'Creation manuelle echouee pour %', v_case.formule;
    end if;
  end loop;

  -- Capacite maximale, Tetiaroa 9 et acompte a 30 %.
  select * into v_result from public.create_manual_charter_reservation(
    '2099-12-01', '2099-12-02', 'tetiaroa_2j_1n', 9,
    'Test', 'Neuf', '', '87 00 00 01', 310000, 93000, 217000,
    'bank_transfer', 'deposit_paid', null, false, true,
    '[{"date":"2099-12-01","slot":"morning"},{"date":"2099-12-01","slot":"afternoon"},{"date":"2099-12-02","slot":"morning"},{"date":"2099-12-02","slot":"afternoon"}]'
  );
  if not v_result.success then raise exception 'Tetiaroa 9 echoue'; end if;

  -- Sunset avec supplement Champagne et paiement integral.
  select * into v_result from public.create_manual_charter_reservation(
    '2099-12-05', '2099-12-05', 'sunset', 4, 'Test', 'Champagne', null,
    '87 00 00 02', 100000, 100000, 0, 'card_terminal', 'paid',
    'white_wine', true, false,
    '[{"date":"2099-12-05","slot":"afternoon"}]'
  );
  if not v_result.success then raise exception 'Sunset Champagne echoue'; end if;

  -- Un slot Peche reserve, un blocage admin et un hold actif refusent tout le lot.
  foreach v_conflict_date in array array[date '2099-12-20', date '2099-12-21', date '2099-12-22']
  loop
    insert into public.boat_calendar_slots(date, slot, status, activity, expires_at, blocked_reason)
    values (
      v_conflict_date, 'afternoon',
      case when v_conflict_date = '2099-12-21' then 'blocked' when v_conflict_date = '2099-12-22' then 'hold' else 'reserved' end,
      case when v_conflict_date = '2099-12-20' then 'peche' when v_conflict_date = '2099-12-22' then 'charter' else null end,
      case when v_conflict_date = '2099-12-22' then now() + interval '30 minutes' else null end,
      case when v_conflict_date = '2099-12-21' then 'Test admin' else null end
    );

    select * into v_result from public.create_manual_charter_reservation(
      v_conflict_date, v_conflict_date, 'sunset', 2, 'Conflit', 'Test', null,
      '87 00 00 03', 75000, 0, 75000, 'check', 'unpaid',
      'white_wine', false, false,
      jsonb_build_array(jsonb_build_object('date', v_conflict_date, 'slot', 'afternoon'))
    );
    if v_result.success or v_result.reservation_id is not null then
      raise exception 'Conflit non detecte le %', v_conflict_date;
    end if;
  end loop;

  -- Conflit J2 : aucune reservation ni aucun slot partiel.
  insert into public.boat_calendar_slots(date, slot, status, activity)
  values ('2099-12-26', 'morning', 'reserved', 'charter');
  select * into v_result from public.create_manual_charter_reservation(
    '2099-12-25', '2099-12-26', 'tetiaroa_2j_1n', 2, 'Conflit', 'J2', null,
    '87 00 00 04', 310000, 0, 310000, 'cash', 'unpaid', null, false, false,
    '[{"date":"2099-12-25","slot":"morning"},{"date":"2099-12-25","slot":"afternoon"},{"date":"2099-12-26","slot":"morning"},{"date":"2099-12-26","slot":"afternoon"}]'
  );
  select count(*) into v_count from public.boat_calendar_slots
  where date = '2099-12-25' and activity = 'charter';
  if v_result.success or v_count <> 0 then raise exception 'Atomicite conflit J2 echouee'; end if;

  -- Conflit J3 du 3J/2N.
  insert into public.boat_calendar_slots(date, slot, status, activity)
  values ('2099-12-30', 'afternoon', 'reserved', 'baleines');
  select * into v_result from public.create_manual_charter_reservation(
    '2099-12-28', '2099-12-30', 'tetiaroa_3j_2n', 2, 'Conflit', 'J3', null,
    '87 00 00 05', 429000, 429000, 0, 'bank_transfer', 'paid', null, false, false,
    '[{"date":"2099-12-28","slot":"morning"},{"date":"2099-12-28","slot":"afternoon"},{"date":"2099-12-29","slot":"morning"},{"date":"2099-12-29","slot":"afternoon"},{"date":"2099-12-30","slot":"morning"},{"date":"2099-12-30","slot":"afternoon"}]'
  );
  if v_result.success then raise exception 'Conflit J3 non detecte'; end if;
end;
$$;

rollback;
