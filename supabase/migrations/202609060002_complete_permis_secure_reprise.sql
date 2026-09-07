-- Step 2D only. Apply AFTER 202609060001; never applied automatically.
-- Replace the existing function without dropping it or changing its privileges.
-- Existing reservations/storage policies and public grants remain unchanged.
-- Add blocked-exam locking and recheck an existing exam on every real change.

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
    if extract(dow from course)=3 and extract(hour from lower(occupied)) < 13 then raise exception 'Wednesday morning unavailable'; end if;
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
