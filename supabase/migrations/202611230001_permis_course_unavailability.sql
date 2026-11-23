begin;

-- Fail before installing the guard if reservation writes lack the shared lock.
do $$
begin
  if to_regclass('permis_exam_guard.writer_lock') is null or not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.reservations'::regclass
      and tgname = 'permis_exam_planning_lock' and tgenabled in ('O','A')
  ) then
    raise exception 'Apply 202611100001_guard_permis_exam_mornings first';
  end if;
end $$;

-- Civil dates and minutes are local to Pacific/Tahiti, as in permis_course_range.
-- End dates are inclusive. Time intervals are half-open.
create table public.permis_indisponibilites (
  id uuid primary key default gen_random_uuid(),
  date_debut date not null,
  date_fin date not null,
  debut_minute integer,
  fin_minute integer,
  motif text check (char_length(motif) <= 500),
  plage tsrange generated always as (
    tsrange(date_debut + make_interval(mins => coalesce(debut_minute, 0)),
            date_fin + make_interval(mins => coalesce(fin_minute, 1440)), '[)')
  ) stored,
  check (date_debut <= date_fin),
  check (
    (debut_minute is null and fin_minute is null) or
    (date_debut = date_fin and debut_minute is not null and fin_minute is not null
      and debut_minute >= 0 and debut_minute < fin_minute and fin_minute <= 1440)
  )
);
create index permis_indisponibilites_plage_idx on public.permis_indisponibilites using gist (plage);
alter table public.permis_indisponibilites enable row level security;
revoke all on public.permis_indisponibilites from public, anon, authenticated, service_role;
grant select, delete on public.permis_indisponibilites to service_role;

-- Historical rows may have unrecognized course labels.
create function public.permis_try_course_range(p_date text, p_slot text)
returns tsrange language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  return public.permis_course_range(p_date, p_slot);
exception when others then
  return null;
end $$;
revoke all on function public.permis_try_course_range(text, text) from public, anon, authenticated;

create function public.permis_add_indisponibilite(
  p_date_debut date, p_date_fin date, p_debut_minute integer, p_fin_minute integer, p_motif text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  bloc public.permis_indisponibilites%rowtype;
  conflits bigint;
begin
  -- Use the same transaction lock as the existing exam/planning write trigger.
  update permis_exam_guard.writer_lock set revision = revision + 1 where singleton;
  if not found then raise exception 'Permis planning lock is missing'; end if;

  insert into public.permis_indisponibilites (date_debut, date_fin, debut_minute, fin_minute, motif)
    values (p_date_debut, p_date_fin, p_debut_minute, p_fin_minute, p_motif)
    returning * into bloc;

  select count(*) into conflits from public.reservations r
    where public.permis_try_civil_date(r.date_cours) between bloc.date_debut and bloc.date_fin
      and (bloc.debut_minute is null or (
        case when public.permis_try_course_range(r.date_cours, r.creneau) is null then true
        else public.permis_try_course_range(r.date_cours, r.creneau) && bloc.plage end
      ));
  return jsonb_build_object('blocage', to_jsonb(bloc) - 'plage', 'conflits', conflits);
end $$;
revoke all on function public.permis_add_indisponibilite(date,date,integer,integer,text) from public, anon, authenticated;
grant execute on function public.permis_add_indisponibilite(date,date,integer,integer,text) to service_role;

create function public.permis_guard_course_availability()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare occupied tsrange; course_day date;
begin
  if tg_op = 'UPDATE' then
    if new.date_cours is not distinct from old.date_cours
       and new.creneau is not distinct from old.creneau then return null; end if;
  end if;

  course_day := public.permis_try_civil_date(new.date_cours);
  if course_day is null then return null; end if;
  occupied := public.permis_course_range(new.date_cours, new.creneau);
  if exists (select 1 from public.permis_indisponibilites b where b.plage && occupied)
     or exists (
       select 1 from public.reservations r
       where r.id <> new.id
         and public.permis_try_civil_date(r.date_cours) = course_day
         and public.permis_try_course_range(r.date_cours, r.creneau) && occupied
     ) then
    raise exception 'Permis course unavailable' using errcode = '23P01';
  end if;
  return null;
end $$;
revoke all on function public.permis_guard_course_availability() from public, anon, authenticated;
create trigger permis_course_availability_guard
after insert or update of date_cours, creneau on public.reservations
for each row execute function public.permis_guard_course_availability();

commit;
