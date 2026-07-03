create table if not exists public.reservations_peche (
  id uuid primary key default gen_random_uuid(),
  date_sortie date not null,
  formule text not null,
  slots text[] not null,
  nombre_personnes integer not null,
  responsable_prenom text not null,
  responsable_nom text not null,
  responsable_email text not null,
  responsable_telephone text not null,
  montant_total integer not null,
  montant_paye integer not null,
  type_paiement text not null,
  statut_paiement text not null default 'pending',
  paye boolean not null default false,
  created_at timestamptz not null default now(),

  constraint reservations_peche_formule_check
    check (formule in ('morning', 'afternoon', 'full_day')),

  constraint reservations_peche_nombre_personnes_check
    check (nombre_personnes between 1 and 4),

  constraint reservations_peche_type_paiement_check
    check (type_paiement in ('deposit', 'full')),

  constraint reservations_peche_statut_paiement_check
    check (statut_paiement in ('pending', 'paid', 'paye', 'cancelled', 'failed')),

  constraint reservations_peche_slots_check
    check (
      slots <@ array['morning', 'afternoon']::text[]
      and cardinality(slots) >= 1
      and cardinality(slots) <= 2
    ),

  constraint reservations_peche_formule_slots_check
    check (
      (formule = 'morning' and slots = array['morning']::text[])
      or (formule = 'afternoon' and slots = array['afternoon']::text[])
      or (formule = 'full_day' and slots = array['morning', 'afternoon']::text[])
    )
);

create index if not exists reservations_peche_date_sortie_idx
  on public.reservations_peche (date_sortie);

create index if not exists reservations_peche_statut_paiement_idx
  on public.reservations_peche (statut_paiement);

alter table public.reservations_peche enable row level security;

drop policy if exists "reservations_peche_public_select"
  on public.reservations_peche;

create policy "reservations_peche_public_select"
  on public.reservations_peche
  for select
  to anon, authenticated
  using (true);

drop policy if exists "reservations_peche_public_insert"
  on public.reservations_peche;

create policy "reservations_peche_public_insert"
  on public.reservations_peche
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "reservations_peche_public_update"
  on public.reservations_peche;

create policy "reservations_peche_public_update"
  on public.reservations_peche
  for update
  to anon, authenticated
  using (true)
  with check (true);
