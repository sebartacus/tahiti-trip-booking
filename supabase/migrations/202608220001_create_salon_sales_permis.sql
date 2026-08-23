create table if not exists public.salon_sales (
  id uuid primary key default gen_random_uuid(),
  client_prenom text not null,
  client_nom text not null,
  client_telephone text not null,
  client_email text,
  sold_at timestamptz not null default now(),
  payment_method text not null check (payment_method in ('tpe', 'especes', 'cheque', 'virement')),
  payment_reference text,
  montant_total integer not null check (montant_total >= 0),
  montant_encaisse integer not null check (montant_encaisse >= 0),
  montant_solde integer not null check (montant_solde >= 0),
  statut text not null default 'paid' check (statut in ('paid', 'partial', 'invoice_pending', 'cancelled')),
  origine text not null default 'salon' check (origine = 'salon'),
  facture_numero text,
  facture_url text,
  facture_generee_at timestamptz,
  facture_envoyee_at timestamptz,
  commentaire_interne text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (montant_encaisse + montant_solde = montant_total)
);

create table if not exists public.salon_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.salon_sales(id) on delete cascade,
  activity text not null check (activity in ('permis', 'peche', 'baleines', 'carnet_baleines', 'charter')),
  offer_code text not null,
  libelle text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price >= 0 and total_price = unit_price * quantity),
  valid_until date not null,
  status text not null default 'reserved' check (status in ('pending', 'reserved', 'redeemed', 'cancelled')),
  reservation_type text,
  reservation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salon_sales_sold_at_idx on public.salon_sales(sold_at desc);
create index if not exists salon_sale_items_sale_id_idx on public.salon_sale_items(sale_id);
create index if not exists salon_sale_items_reservation_idx on public.salon_sale_items(reservation_type, reservation_id);

alter table public.salon_sales enable row level security;
alter table public.salon_sale_items enable row level security;
revoke all on public.salon_sales from anon, authenticated;
revoke all on public.salon_sale_items from anon, authenticated;
grant select, insert, update, delete on public.salon_sales to service_role;
grant select, insert, update, delete on public.salon_sale_items to service_role;

alter table public.reservations drop constraint if exists reservations_mode_paiement_check;
alter table public.reservations add constraint reservations_mode_paiement_check
  check (mode_paiement in ('payzen', 'especes', 'cheque', 'tpe', 'virement')) not valid;
alter table public.reservations validate constraint reservations_mode_paiement_check;

alter table public.reservations drop constraint if exists reservations_origine_reservation_check;
alter table public.reservations add constraint reservations_origine_reservation_check
  check (origine_reservation in ('site', 'salon_admin', 'salon')) not valid;
alter table public.reservations validate constraint reservations_origine_reservation_check;

create or replace function public.set_salon_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists set_salon_sales_updated_at on public.salon_sales;
create trigger set_salon_sales_updated_at before update on public.salon_sales
for each row execute function public.set_salon_updated_at();
drop trigger if exists set_salon_sale_items_updated_at on public.salon_sale_items;
create trigger set_salon_sale_items_updated_at before update on public.salon_sale_items
for each row execute function public.set_salon_updated_at();

create or replace function public.create_salon_permis_sale(
  p_offer_code text, p_formula text, p_label text, p_price integer, p_valid_until date,
  p_prenom text, p_nom text, p_telephone text, p_email text,
  p_payment_method text, p_payment_reference text, p_commentaire text,
  p_examen text, p_course_later boolean, p_date_cours text, p_type_cours text, p_creneau text
) returns table (sale_id uuid, item_id uuid, reservation_id text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_sale_id uuid;
  v_item_id uuid;
  v_reservation_id text;
begin
  if p_offer_code not in ('permis_classique', 'permis_serenite') or p_formula not in ('Classique', 'Sérénité') then
    raise exception 'Offre Permis Salon invalide' using errcode = '22023';
  end if;
  if p_price <= 0 or p_payment_method not in ('tpe', 'especes', 'cheque', 'virement') then
    raise exception 'Paiement Salon invalide' using errcode = '22023';
  end if;
  if nullif(trim(p_prenom), '') is null or nullif(trim(p_nom), '') is null or nullif(trim(p_telephone), '') is null then
    raise exception 'Client incomplet' using errcode = '22023';
  end if;
  if not p_course_later then
    perform pg_advisory_xact_lock(hashtextextended('permis-course:' || p_date_cours, 0));
    if exists (
      select 1 from public.reservations r where r.date_cours = p_date_cours and r.creneau is not null
      and split_part(r.creneau, 'h', 1)::integer * 60 + split_part(split_part(r.creneau, ' - ', 1), 'h', 2)::integer
          < split_part(split_part(p_creneau, ' - ', 2), 'h', 1)::integer * 60 + split_part(split_part(p_creneau, ' - ', 2), 'h', 2)::integer
      and split_part(split_part(r.creneau, ' - ', 2), 'h', 1)::integer * 60 + split_part(split_part(r.creneau, ' - ', 2), 'h', 2)::integer
          > split_part(p_creneau, 'h', 1)::integer * 60 + split_part(split_part(p_creneau, ' - ', 1), 'h', 2)::integer
    ) then raise exception 'Créneau Permis indisponible' using errcode = '23505'; end if;
  end if;

  insert into public.salon_sales(client_prenom, client_nom, client_telephone, client_email, payment_method,
    payment_reference, montant_total, montant_encaisse, montant_solde, statut, commentaire_interne)
  values(trim(p_prenom), trim(p_nom), trim(p_telephone), nullif(trim(p_email), ''), p_payment_method,
    nullif(trim(p_payment_reference), ''), p_price, p_price, 0, 'invoice_pending', nullif(trim(p_commentaire), ''))
  returning id into v_sale_id;

  insert into public.reservations(prenom, nom, telephone, email, formule, examen, date_cours, type_cours, creneau,
    paiement_effectue, pricing_type, pricing_amount, mode_paiement, reference_paiement, paid_at,
    origine_reservation, statut)
  values(trim(p_prenom), trim(p_nom), trim(p_telephone), nullif(trim(p_email), ''), p_formula, p_examen,
    case when p_course_later then null else p_date_cours end,
    case when p_course_later then null else p_type_cours end,
    case when p_course_later then null else p_creneau end,
    true, 'salon_tourisme', p_price, p_payment_method, nullif(trim(p_payment_reference), ''), now(), 'salon', 'Validé')
  returning id::text into v_reservation_id;

  insert into public.salon_sale_items(sale_id, activity, offer_code, libelle, quantity, unit_price, total_price,
    valid_until, status, reservation_type, reservation_id)
  values(v_sale_id, 'permis', p_offer_code, p_label, 1, p_price, p_price, p_valid_until,
    'reserved', 'reservations', v_reservation_id)
  returning id into v_item_id;
  return query select v_sale_id, v_item_id, v_reservation_id;
end;
$$;

revoke all on function public.create_salon_permis_sale(text,text,text,integer,date,text,text,text,text,text,text,text,text,boolean,text,text,text) from public;
grant execute on function public.create_salon_permis_sale(text,text,text,integer,date,text,text,text,text,text,text,text,text,boolean,text,text,text) to service_role;
