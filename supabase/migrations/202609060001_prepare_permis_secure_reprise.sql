-- ADDITIVE FOUNDATION ONLY. Not applied by this change.
-- Existing reservations/storage policies and privileges are deliberately untouched.
-- Global exclusion constraint deferred: current public/Salon writers have not
-- been migrated to handle conflicts yet. The save RPC below is NOT an activation
-- authorization and cannot protect against a later unchecked legacy insert.
-- Apply only after reviewing on a disposable PostgreSQL database.

create table public.permis_access_challenges (
  id uuid primary key,
  reservation_id text,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz
);
create index permis_access_challenges_expiry_idx on public.permis_access_challenges(expires_at);
create table public.permis_access_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.permis_access_challenges enable row level security;
alter table public.permis_access_limits enable row level security;
-- Only NEW objects are restricted. No existing grant is changed.
revoke all on public.permis_access_challenges, public.permis_access_limits from public, anon, authenticated;
grant select, insert, update, delete on public.permis_access_challenges, public.permis_access_limits to service_role;

create function public.permis_take_access_limit(p_key text, p_max integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer; v_now timestamptz := clock_timestamp();
begin
  if p_key !~ '^[0-9a-f]{64}$' or p_max < 1 or p_max > 100 then
    raise exception 'Invalid limiter';
  end if;
  insert into public.permis_access_limits as l(key_hash,window_started_at,attempts)
  values(p_key,v_now,1)
  on conflict(key_hash) do update set
    attempts = case when l.window_started_at <= v_now - interval '10 minutes' then 1 else l.attempts + 1 end,
    window_started_at = case when l.window_started_at <= v_now - interval '10 minutes' then v_now else l.window_started_at end
  returning attempts into v_count;
  return v_count <= p_max;
end;
$$;

create function public.permis_issue_access_challenge(
  p_id uuid, p_contact text, p_code_hash text, p_ip_key text, p_contact_key text
) returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_ids text[]; v_email text; v_ip_ok boolean; v_contact_ok boolean;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' or length(p_contact) > 254 then raise exception 'Invalid challenge'; end if;
  -- Stable limiter lock order across concurrent requests.
  v_ip_ok := public.permis_take_access_limit(p_ip_key,20);
  v_contact_ok := public.permis_take_access_limit(p_contact_key,3);
  if not v_ip_ok or not v_contact_ok then return null; end if;
  delete from public.permis_access_challenges where expires_at < clock_timestamp() - interval '1 day';
  delete from public.permis_access_limits where window_started_at < clock_timestamp() - interval '1 day';
  select array_agg(m.id) into v_ids from (
    select r.id::text as id from public.reservations r
    where not coalesce(r.archived,false) and
      case when position('@' in p_contact) > 0 then lower(btrim(r.email)) = lower(btrim(p_contact))
      else regexp_replace(coalesce(r.telephone,''),'[^0-9]','','g') = p_contact end
    limit 2
  ) m;
  -- Ambiguous contacts receive no code and no candidate session. Never pick latest.
  if coalesce(cardinality(v_ids),0) <> 1 then return null; end if;
  select btrim(r.email) into v_email from public.reservations r where r.id::text = v_ids[1];
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return null; end if;
  -- Serialize issuance for this dossier; one live challenge at a time.
  perform pg_advisory_xact_lock(hashtextextended('permis-access:' || v_ids[1],0));
  -- Also cap destination across email/phone aliases using the already issued records.
  if (select count(*) from public.permis_access_challenges c where c.reservation_id=v_ids[1] and c.created_at > clock_timestamp()-interval '10 minutes') >= 3 then return null; end if;
  update public.permis_access_challenges set consumed_at=clock_timestamp()
    where reservation_id=v_ids[1] and consumed_at is null;
  insert into public.permis_access_challenges(id,reservation_id,code_hash,expires_at)
    values(p_id,v_ids[1],p_code_hash,clock_timestamp()+interval '10 minutes');
  return v_email;
end;
$$;

create function public.permis_consume_access_challenge(p_id uuid,p_code_hash text,p_ip_key text)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.permis_access_challenges%rowtype;
begin
  if not public.permis_take_access_limit(p_ip_key,30) then return null; end if;
  select * into c from public.permis_access_challenges where id=p_id for update;
  if not found or c.consumed_at is not null or c.expires_at <= clock_timestamp() or c.attempts >= 5 then return null; end if;
  update public.permis_access_challenges set attempts=attempts+1 where id=p_id;
  if p_code_hash is null or c.code_hash <> p_code_hash then return null; end if;
  if not exists(select 1 from public.reservations r where r.id::text=c.reservation_id and not coalesce(r.archived,false)) then return null; end if;
  update public.permis_access_challenges set consumed_at=clock_timestamp() where id=p_id;
  return c.reservation_id;
end;
$$;

create function public.permis_parse_civil_date(p_value text)
returns date language plpgsql immutable set search_path = pg_catalog, public as $$
declare v text := lower(btrim(p_value)); m text[]; mm integer;
begin
  if v is null or v in ('','plus tard') then return null; end if;
  if v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    m := regexp_match(v,'^([0-9]{4})-([0-9]{2})-([0-9]{2})$');
    return make_date(m[1]::integer,m[2]::integer,m[3]::integer);
  end if;
  if v ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' then
    m := regexp_match(v,'^([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})$');
    return make_date(m[3]::integer,m[2]::integer,m[1]::integer);
  end if;
  v := translate(v,'éûô','euo');
  m := regexp_match(v,'^([0-9]{1,2}) +([a-z]+) +([0-9]{4})$');
  if m is not null then
    mm := array_position(array['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'],m[2]);
    if mm is not null then return make_date(m[3]::integer,mm,m[1]::integer); end if;
  end if;
  raise exception 'Unrecognized Permis date';
end;
$$;
create function public.permis_course_range(p_date text,p_slot text)
returns tsrange language plpgsql immutable set search_path = pg_catalog, public as $$
declare d date; m text[]; a integer; b integer;
begin
  if nullif(btrim(p_date),'') is null and nullif(btrim(p_slot),'') is null then return null; end if;
  d := public.permis_parse_civil_date(p_date);
  m := regexp_match(btrim(p_slot),'^([0-9]{2})h([0-9]{2}) - ([0-9]{2})h([0-9]{2})$');
  if d is null or m is null then raise exception 'Incomplete Permis course'; end if;
  if m[1]::integer > 23 or m[3]::integer > 23 or m[2]::integer > 59 or m[4]::integer > 59 then raise exception 'Invalid slot'; end if;
  a := m[1]::integer*60+m[2]::integer; b := m[3]::integer*60+m[4]::integer;
  if a >= b then raise exception 'Invalid slot'; end if;
  return tsrange(d::timestamp+make_interval(mins=>a),d::timestamp+make_interval(mins=>b),'[)');
end;
$$;

-- Future server-only primitive. No current route calls it.
-- Caller must additionally validate exam session calendar / holidays and allowed
-- formula slots before calling; this is not a public scheduling endpoint.
create function public.permis_save_planning(p_reservation_id text,p_expected jsonb,p_patch jsonb)
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
    if exists(select 1 from public.examens_bloques e where e.date_examen::text=exam::text) then raise exception 'Blocked exam'; end if;
  end if;
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

-- Restrictions apply exclusively to functions introduced in this migration.
revoke all on function public.permis_take_access_limit(text,integer) from public,anon,authenticated;
revoke all on function public.permis_issue_access_challenge(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.permis_consume_access_challenge(uuid,text,text) from public,anon,authenticated;
revoke all on function public.permis_parse_civil_date(text) from public,anon,authenticated;
revoke all on function public.permis_course_range(text,text) from public,anon,authenticated;
revoke all on function public.permis_save_planning(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.permis_take_access_limit(text,integer) to service_role;
grant execute on function public.permis_issue_access_challenge(uuid,text,text,text,text) to service_role;
grant execute on function public.permis_consume_access_challenge(uuid,text,text) to service_role;
grant execute on function public.permis_parse_civil_date(text) to service_role;
grant execute on function public.permis_course_range(text,text) to service_role;
grant execute on function public.permis_save_planning(text,jsonb,jsonb) to service_role;
