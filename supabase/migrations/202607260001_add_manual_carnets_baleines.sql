alter table public.carnets_baleines
  add column if not exists mode_paiement text,
  add column if not exists reference_paiement text,
  add column if not exists montant_encaisse integer,
  add column if not exists origine_creation text;

alter table public.carnets_baleines
  drop constraint if exists carnets_baleines_mode_paiement_check,
  add constraint carnets_baleines_mode_paiement_check
    check (
      mode_paiement is null
      or mode_paiement in ('payzen', 'especes', 'cheque', 'virement', 'carte', 'autre')
    ),
  drop constraint if exists carnets_baleines_origine_creation_check,
  add constraint carnets_baleines_origine_creation_check
    check (
      origine_creation is null
      or origine_creation in ('payzen', 'manuel')
    ),
  drop constraint if exists carnets_baleines_montant_encaisse_check,
  add constraint carnets_baleines_montant_encaisse_check
    check (montant_encaisse is null or montant_encaisse >= 0);
