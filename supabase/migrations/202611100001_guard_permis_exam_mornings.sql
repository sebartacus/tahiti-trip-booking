-- PREPARED ONLY. Do not apply without approval. No backfill or changes to existing rows.
-- Requires the civil-date parser and secure-planning RPC from 202609060001/0002.
-- Dates below mirror permisExamDay.ts and the verified calendar in permisHolidays.ts.
-- Extend both calendars together; the parity test checks every covered civil day.
begin;

-- Fail closed: never create the planning RPC, and never repair its ACL blindly.
-- CREATE OR REPLACE below preserves this verified function's owner and ACL.
do $$
declare rpc_oid oid; definition record;
begin
  rpc_oid := to_regprocedure('public.permis_save_planning(text,jsonb,jsonb)');
  if rpc_oid is null then
    raise exception 'Required secure RPC public.permis_save_planning(text,jsonb,jsonb) is missing' using errcode = '42883';
  end if;
  select proowner, proacl, prosecdef, prorettype, prokind into definition from pg_proc where oid = rpc_oid;
  if definition.prokind <> 'f' or definition.prorettype <> 'jsonb'::regtype or not definition.prosecdef then
    raise exception 'Unexpected planning RPC definition; inspect prerequisites' using errcode = '42809';
  end if;
  if exists(select 1 from aclexplode(coalesce(definition.proacl, acldefault('f', definition.proowner)))
            where grantee = 0 and privilege_type = 'EXECUTE')
     or has_function_privilege('anon', rpc_oid, 'EXECUTE')
     or has_function_privilege('authenticated', rpc_oid, 'EXECUTE')
     or not has_function_privilege('service_role', rpc_oid, 'EXECUTE') then
    raise exception 'Unsafe planning RPC privileges; inspect existing grants before migration' using errcode = '42501';
  end if;
  if to_regprocedure('public.permis_parse_civil_date(text)') is null
     or to_regprocedure('public.permis_course_range(text,text)') is null then
    raise exception 'Required Permis date/slot functions are missing' using errcode = '42883';
  end if;
end $$;

-- Private coordination only: no reservation backfill, no RLS/policy changes.
-- Updating this singleton serializes planning writers until transaction end.
-- Under repeatable-read/serializable isolation, a stale concurrent writer gets
-- a serialization failure instead of validating against an obsolete snapshot.
create schema permis_exam_guard;
revoke all on schema permis_exam_guard from public, anon, authenticated, service_role;
create table permis_exam_guard.writer_lock (
  singleton boolean primary key check (singleton),
  revision bigint not null
);
insert into permis_exam_guard.writer_lock values (true, 0);
revoke all on permis_exam_guard.writer_lock from public, anon, authenticated, service_role;
-- Keep each trigger nesting level's pre-statement sessions separate. This also
-- handles UPSERT, whose INSERT and UPDATE transition tables are distinct.
create table permis_exam_guard.statement_sessions (
  trigger_depth integer primary key,
  days date[] not null
);
revoke all on permis_exam_guard.statement_sessions from public, anon, authenticated, service_role;

create function public.permis_lock_exam_planning()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare prior_days date[];
begin
  update permis_exam_guard.writer_lock set revision = revision + 1 where singleton;
  if not found then raise exception 'Permis planning lock is missing'; end if;
  select coalesce(array_remove(array_agg(distinct public.permis_try_civil_date(examen)),null),'{}'::date[])
    into prior_days from public.reservations where examen is not null;
  insert into permis_exam_guard.statement_sessions(trigger_depth,days)
    values(pg_trigger_depth(),prior_days)
    on conflict(trigger_depth) do update set days=excluded.days;
  return null;
end $$;
revoke all on function public.permis_lock_exam_planning() from public, anon, authenticated;
create trigger permis_exam_planning_lock
before insert or update of id,examen,date_cours,creneau on public.reservations
for each statement execute function public.permis_lock_exam_planning();

-- Historical malformed labels are not session dates. Never parse arbitrary old
-- courses with permis_course_range while validating an unrelated new session.
create function public.permis_try_civil_date(p_value text)
returns date language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  return public.permis_parse_civil_date(p_value);
exception when others then return null;
end $$;
revoke all on function public.permis_try_civil_date(text) from public, anon, authenticated;

create or replace function public.permis_recorded_exam_day(p_day date)
returns boolean language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v text; parsed date;
begin
  for v in select distinct examen from public.reservations where examen is not null loop
    -- A malformed historical label is not a session date. Do not block unrelated sales.
    begin parsed := public.permis_parse_civil_date(v);
    exception when others then continue; end;
    if parsed = p_day then return true; end if;
  end loop;
  return false;
end $$;
revoke all on function public.permis_recorded_exam_day(date) from public, anon, authenticated;

create function public.permis_is_regular_exam_day(p_day date)
returns boolean language sql immutable set search_path = pg_catalog, public as $$
  select coalesce(p_day = any(array[
    '2026-01-07'::date,
    '2026-01-14'::date,
    '2026-01-21'::date,
    '2026-01-28'::date,
    '2026-02-04'::date,
    '2026-02-11'::date,
    '2026-02-18'::date,
    '2026-02-25'::date,
    '2026-03-04'::date,
    '2026-03-11'::date,
    '2026-03-18'::date,
    '2026-03-25'::date,
    '2026-04-01'::date,
    '2026-04-08'::date,
    '2026-04-15'::date,
    '2026-04-22'::date,
    '2026-04-29'::date,
    '2026-05-06'::date,
    '2026-05-13'::date,
    '2026-05-20'::date,
    '2026-05-27'::date,
    '2026-06-03'::date,
    '2026-06-10'::date,
    '2026-06-17'::date,
    '2026-06-24'::date,
    '2026-07-01'::date,
    '2026-07-08'::date,
    '2026-07-15'::date,
    '2026-07-22'::date,
    '2026-07-29'::date,
    '2026-08-05'::date,
    '2026-08-12'::date,
    '2026-08-19'::date,
    '2026-08-26'::date,
    '2026-09-02'::date,
    '2026-09-09'::date,
    '2026-09-16'::date,
    '2026-09-23'::date,
    '2026-09-30'::date,
    '2026-10-07'::date,
    '2026-10-14'::date,
    '2026-10-21'::date,
    '2026-10-28'::date,
    '2026-11-04'::date,
    '2026-11-12'::date,
    '2026-11-18'::date,
    '2026-11-25'::date,
    '2026-12-02'::date,
    '2026-12-09'::date,
    '2026-12-16'::date,
    '2027-01-13'::date,
    '2027-01-20'::date,
    '2027-01-27'::date
  ]),false)
$$;
revoke all on function public.permis_is_regular_exam_day(date) from public, anon, authenticated;

create or replace function public.permis_is_exam_day(p_day date)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select public.permis_is_regular_exam_day(p_day) or public.permis_recorded_exam_day(p_day)
$$;
revoke all on function public.permis_is_exam_day(date) from public, anon, authenticated;
grant execute on function public.permis_is_exam_day(date) to service_role;

create or replace function public.permis_guard_exam_morning()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare exam_day date; course_day date; occupied tsrange; course_changed boolean := true;
begin
  if TG_OP = 'UPDATE' then
    if new.examen is not distinct from old.examen and new.date_cours is not distinct from old.date_cours
       and new.creneau is not distinct from old.creneau then return new; end if;
    course_changed := new.date_cours is distinct from old.date_cours or new.creneau is distinct from old.creneau;
  end if;
  exam_day := public.permis_parse_civil_date(new.examen);
  course_day := public.permis_parse_civil_date(new.date_cours);
  if exam_day is not null and course_day is not null and course_day >= exam_day then
    raise exception 'Course must precede exam' using errcode = '23514';
  end if;
  if course_changed and course_day is not null then
    occupied := public.permis_course_range(new.date_cours,new.creneau);
    -- Session conflicts are checked after all rows of this statement are written.
  end if;
  return new;
end $$;
revoke all on function public.permis_guard_exam_morning() from public, anon, authenticated;
create trigger permis_exam_morning_guard
before insert or update of examen,date_cours,creneau on public.reservations
for each row execute function public.permis_guard_exam_morning();


-- Transition tables expose the final INSERT/UPDATE batch. Check both directions:
-- changed courses against all sessions, and newly introduced sessions against
-- all morning courses. A conflict aborts the statement/transaction, never moves
-- or deletes historical bookings. Existing sessions may keep historic anomalies.
create function public.permis_check_exam_morning_statement()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare r record; old_exam text; old_course text; old_slot text;
  course_changed boolean; exam_changed boolean; exam_day date; course_day date;
  occupied tsrange; previously_scheduled boolean;
begin
  for r in select id,examen,date_cours,creneau from new_planning loop
    course_changed := true;
    exam_changed := true;
    if TG_OP = 'UPDATE' then
      select examen,date_cours,creneau into old_exam,old_course,old_slot from old_planning where id = r.id;
      if found then
        course_changed := r.date_cours is distinct from old_course or r.creneau is distinct from old_slot;
        exam_changed := public.permis_try_civil_date(r.examen) is distinct from public.permis_try_civil_date(old_exam);
      end if;
    end if;
    if not course_changed and not exam_changed then continue; end if;
    course_day := public.permis_try_civil_date(r.date_cours);
    if course_changed and course_day is not null then
      occupied := public.permis_course_range(r.date_cours,r.creneau);
      if public.permis_is_exam_day(course_day) and extract(hour from lower(occupied)) < 13 then
        raise exception 'Exam morning unavailable' using errcode = '23514';
      end if;
    end if;
    exam_day := public.permis_try_civil_date(r.examen);
    if not exam_changed or exam_day is null or public.permis_is_regular_exam_day(exam_day) then continue; end if;
    -- Snapshot taken before either branch of the statement, including UPSERT.
    select exam_day = any(days) into previously_scheduled
      from permis_exam_guard.statement_sessions where trigger_depth=pg_trigger_depth();
    if not found then raise exception 'Permis pre-statement sessions are missing'; end if;
    if not previously_scheduled and exists(select 1 from public.reservations course
      where public.permis_try_civil_date(course.date_cours) = exam_day
        -- CASE guards casts even when the planner reorders filter expressions.
        and case when btrim(course.creneau) ~ '^([01][0-9]|2[0-3])h[0-5][0-9] - ([01][0-9]|2[0-3])h[0-5][0-9]$'
          then left(btrim(course.creneau),2)::integer < 13
            and left(btrim(course.creneau),5) < right(btrim(course.creneau),5)
          else false end) then
      raise exception 'New exam session conflicts with a morning course' using errcode = '23514';
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.permis_check_exam_morning_statement() from public, anon, authenticated;
create trigger permis_exam_morning_insert_check
after insert on public.reservations
referencing new table as new_planning
for each statement execute function public.permis_check_exam_morning_statement();
create trigger permis_exam_morning_update_check
after update on public.reservations
referencing old table as old_planning new table as new_planning
for each statement execute function public.permis_check_exam_morning_statement();

-- Replace the old Wednesday-only RPC check; retain locking, conflicts and chronology.
create or replace function public.permis_save_planning(p_reservation_id text,p_expected jsonb,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.reservations%rowtype; before_value jsonb; after_value jsonb;
  exam date; course date; slot text; occupied tsrange; today date := (clock_timestamp() at time zone 'Pacific/Tahiti')::date;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_expected is null or jsonb_typeof(p_expected) <> 'object' then raise exception 'Invalid planning'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('examen','date_cours','creneau')) then raise exception 'Unexpected field'; end if;
  if exists(select 1 from jsonb_each(p_patch) kv where jsonb_typeof(kv.value) not in ('string','null')) then raise exception 'Invalid field type'; end if;
  -- Table lock serializes current writes while this transaction checks and saves.
  -- It does NOT replace a future global exclusion constraint for legacy writers.
  lock table public.reservations in share row exclusive mode;
  -- Keep the blocked-session check stable until the save commits.
  lock table public.examens_bloques in share mode;
  select * into r from public.reservations where id::text=p_reservation_id and not coalesce(archived,false) for update;
  if not found then raise exception 'Dossier unavailable'; end if;
  before_value := jsonb_build_object('examen',public.permis_parse_civil_date(r.examen),'date_cours',public.permis_parse_civil_date(r.date_cours),'creneau',nullif(btrim(r.creneau),''));
  if before_value <> p_expected then return jsonb_build_object('status','stale'); end if;
  exam := public.permis_parse_civil_date(case when p_patch ? 'examen' then p_patch->>'examen' else r.examen end);
  course := public.permis_parse_civil_date(case when p_patch ? 'date_cours' then p_patch->>'date_cours' else r.date_cours end);
  slot := nullif(btrim(case when p_patch ? 'creneau' then p_patch->>'creneau' else r.creneau end),'');
  after_value := jsonb_build_object('examen',exam,'date_cours',course,'creneau',slot);
  if before_value = after_value then return jsonb_build_object('status','unchanged','before',before_value,'after',after_value); end if;
  if exam is not null and course is not null and course >= exam then raise exception 'Course must precede exam'; end if;
  if exam is distinct from public.permis_parse_civil_date(r.examen) and exam is not null then
    if exam < today + 8 then raise exception 'Exam registration deadline'; end if;
  end if;
  if exam is not null and exists(select 1 from public.examens_bloques e where e.date_examen::text=exam::text) then raise exception 'Blocked exam'; end if;
  occupied := public.permis_course_range(course::text,slot);
  if (course is distinct from public.permis_parse_civil_date(r.date_cours) or slot is distinct from nullif(btrim(r.creneau),'')) and course is not null then
    if course < today then raise exception 'Past course'; end if;
    if public.permis_is_exam_day(course) and extract(hour from lower(occupied)) < 13 then raise exception 'Exam morning unavailable'; end if;
    if exists(select 1 from public.reservations other where other.id <> r.id and public.permis_course_range(other.date_cours,other.creneau) && occupied) then
      return jsonb_build_object('status','conflict');
    end if;
  end if;
  update public.reservations set
    examen=case when exam is not distinct from public.permis_parse_civil_date(r.examen) then r.examen else to_char(exam,'DD/MM/YYYY') end,
    date_cours=case when course is not distinct from public.permis_parse_civil_date(r.date_cours) then r.date_cours else to_char(course,'DD/MM/YYYY') end,
    creneau=slot where id=r.id;
  return jsonb_build_object('status','changed','before',before_value,'after',after_value);
end;
$$;

commit;
