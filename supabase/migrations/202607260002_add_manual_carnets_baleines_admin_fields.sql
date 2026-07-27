alter table public.carnets_baleines
  add column if not exists commentaire_interne text,
  add column if not exists facture_remise boolean not null default false;

alter table public.carnets_baleines
  drop constraint if exists carnets_baleines_montant_encaisse_check,
  add constraint carnets_baleines_montant_encaisse_check
    check (montant_encaisse is null or montant_encaisse > 0)
    not valid;
