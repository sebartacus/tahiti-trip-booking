alter table public.reservations_peche
  add column if not exists origine text,
  add column if not exists commentaire text;

alter table public.reservations_peche
  alter column responsable_email drop not null;

alter table public.reservations_peche
  drop constraint if exists reservations_peche_type_paiement_check;

alter table public.reservations_peche
  add constraint reservations_peche_type_paiement_check
    check (type_paiement in ('deposit', 'full', 'external_invoice'));

alter table public.reservations_peche
  drop constraint if exists reservations_peche_statut_paiement_check;

alter table public.reservations_peche
  add constraint reservations_peche_statut_paiement_check
    check (
      statut_paiement in (
        'pending',
        'paid',
        'paye',
        'cancelled',
        'failed',
        'paiement_externe_a_facturer'
      )
    );
