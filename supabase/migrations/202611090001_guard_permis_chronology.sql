-- Prepared only: no backfill, no validation or modification of existing rows.
-- Uses the civil-date parser installed by the secure reprise migrations.
create or replace function public.permis_guard_chronology()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare exam_day date; course_day date;
begin
  if TG_OP = 'UPDATE' then
    if new.examen is not distinct from old.examen
       and new.date_cours is not distinct from old.date_cours
       and new.creneau is not distinct from old.creneau then return new; end if;
  end if;
  exam_day := public.permis_parse_civil_date(new.examen);
  course_day := public.permis_parse_civil_date(new.date_cours);
  if exam_day is not null and course_day is not null and course_day >= exam_day then
    raise exception 'Course must precede exam' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.permis_guard_chronology() from public;
create trigger permis_chronology_guard
before insert or update of examen, date_cours, creneau on public.reservations
for each row execute function public.permis_guard_chronology();
