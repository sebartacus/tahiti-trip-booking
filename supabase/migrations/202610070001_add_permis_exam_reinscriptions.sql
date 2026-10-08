-- Prepared only: DO NOT apply automatically or to production.
-- No dependency on the optional secure-reprise migrations.
begin;
-- Infer the reservation ID type from the existing table (no assumption bigint/uuid).
create table public.permis_exam_reinscriptions as
select id as reservation_id from public.reservations with no data;
alter table public.permis_exam_reinscriptions
  add column id bigint generated always as identity primary key,
  alter column reservation_id set not null,
  add column ancienne_date_examen date not null,
  add column resultat text not null default 'echec' check (resultat = 'echec'),
  add column nouvelle_date_examen date not null,
  add column reinscrit_at timestamptz not null default clock_timestamp(),
  add constraint permis_exam_reinscriptions_reservation_fk foreign key (reservation_id) references public.reservations(id) on delete restrict,
  add constraint permis_exam_reinscriptions_dates check (nouvelle_date_examen > ancienne_date_examen);
create index permis_exam_reinscriptions_dossier_idx on public.permis_exam_reinscriptions(reservation_id, reinscrit_at desc);
alter table public.permis_exam_reinscriptions enable row level security;
revoke all on public.permis_exam_reinscriptions from public, anon, authenticated;
grant select on public.permis_exam_reinscriptions to service_role;

create function public.permis_reinscrire_examen(p_reservation_id text, p_expected_examen text, p_ancienne_date date, p_nouvelle_date date)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.reservations%rowtype;
  today date := (clock_timestamp() at time zone 'Pacific/Tahiti')::date;
  exam_text text;
begin
  -- The authenticated server validates p_nouvelle_date using permisExamOptions.
  -- Blocked sessions remain stable until the transaction ends.
  lock table public.examens_bloques in share mode;
  select * into r from public.reservations where id::text = p_reservation_id for update;
  if not found or coalesce(r.archived,false) or r.statut = 'Permis obtenu' then return jsonb_build_object('status','unavailable'); end if;
  if nullif(btrim(r.prenom2),'') is not null or nullif(btrim(r.nom2),'') is not null then return jsonb_build_object('status','double'); end if;
  if r.examen is distinct from p_expected_examen then return jsonb_build_object('status','stale'); end if;
  if p_ancienne_date is null or p_nouvelle_date is null or p_ancienne_date >= today or p_nouvelle_date < today + 8 then return jsonb_build_object('status','invalid'); end if;
  if exists(select 1 from public.examens_bloques where date_examen::text = p_nouvelle_date::text) then return jsonb_build_object('status','blocked'); end if;
  exam_text := to_char(p_nouvelle_date,'DD/MM/YYYY');
  insert into public.permis_exam_reinscriptions(reservation_id, ancienne_date_examen, resultat, nouvelle_date_examen)
    values(r.id, p_ancienne_date, 'echec', p_nouvelle_date);
  update public.reservations set examen = exam_text where id = r.id;
  return jsonb_build_object('status','changed','examen',exam_text);
end;
$$;
revoke all on function public.permis_reinscrire_examen(text,text,date,date) from public, anon, authenticated;
grant execute on function public.permis_reinscrire_examen(text,text,date,date) to service_role;
commit;
