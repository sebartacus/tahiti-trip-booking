alter table public.carnets_baleines drop constraint if exists carnets_baleines_mode_paiement_check;
alter table public.carnets_baleines add constraint carnets_baleines_mode_paiement_check
  check (mode_paiement is null or mode_paiement in ('payzen', 'especes', 'cheque', 'virement', 'carte', 'tpe', 'autre')) not valid;
alter table public.carnets_baleines validate constraint carnets_baleines_mode_paiement_check;

alter table public.carnets_baleines drop constraint if exists carnets_baleines_origine_creation_check;
alter table public.carnets_baleines add constraint carnets_baleines_origine_creation_check
  check (origine_creation is null or origine_creation in ('payzen', 'manuel', 'salon')) not valid;
alter table public.carnets_baleines validate constraint carnets_baleines_origine_creation_check;

create or replace function public.create_salon_carnet_baleines_sale(
  p_offer_code text, p_label text, p_credits integer, p_salon_price integer,
  p_normal_price integer, p_valid_until date, p_prenom text, p_nom text,
  p_telephone text, p_email text, p_payment_method text,
  p_payment_reference text, p_commentaire text
) returns table (sale_id uuid, item_id uuid, carnet_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_sale_id uuid; v_item_id uuid; v_carnet_id uuid;
begin
  if (p_offer_code = 'carnet_baleines_5' and p_credits <> 5)
    or (p_offer_code = 'carnet_baleines_10' and p_credits <> 10)
    or p_offer_code not in ('carnet_baleines_5', 'carnet_baleines_10') then
    raise exception 'Offre carnet Salon invalide' using errcode = '22023';
  end if;
  if p_salon_price <= 0 or p_normal_price <= 0 or p_payment_method not in ('tpe', 'especes', 'cheque', 'virement') then
    raise exception 'Paiement carnet Salon invalide' using errcode = '22023';
  end if;
  if nullif(trim(p_prenom), '') is null or nullif(trim(p_nom), '') is null or nullif(trim(p_telephone), '') is null then
    raise exception 'Client incomplet' using errcode = '22023';
  end if;

  insert into public.salon_sales(client_prenom, client_nom, client_telephone, client_email,
    payment_method, payment_reference, montant_total, montant_encaisse, montant_solde,
    statut, commentaire_interne)
  values(trim(p_prenom), trim(p_nom), trim(p_telephone), nullif(trim(p_email), ''),
    p_payment_method, nullif(trim(p_payment_reference), ''), p_salon_price,
    p_salon_price, 0, 'invoice_pending', nullif(trim(p_commentaire), ''))
  returning id into v_sale_id;

  insert into public.carnets_baleines(type_carnet, credits_initiaux, credits_restants,
    prix, prenom_acheteur, nom_acheteur, email, telephone, date_expiration, statut,
    paiement_effectue, paid_at, mode_paiement, reference_paiement, montant_encaisse,
    origine_creation, commentaire_interne, facture_remise)
  values(p_credits, p_credits, p_credits, p_normal_price, trim(p_prenom), trim(p_nom),
    coalesce(nullif(trim(p_email), ''), ''), trim(p_telephone), p_valid_until, 'actif', true,
    now(), p_payment_method, nullif(trim(p_payment_reference), ''), p_salon_price,
    'salon', nullif(trim(p_commentaire), ''), false)
  returning id into v_carnet_id;

  insert into public.salon_sale_items(sale_id, activity, offer_code, libelle, quantity,
    unit_price, total_price, valid_until, status, reservation_type, reservation_id)
  values(v_sale_id, 'carnet_baleines', p_offer_code, p_label, 1, p_salon_price,
    p_salon_price, p_valid_until, 'reserved', 'carnets_baleines', v_carnet_id::text)
  returning id into v_item_id;
  return query select v_sale_id, v_item_id, v_carnet_id;
end;
$$;

revoke all on function public.create_salon_carnet_baleines_sale(text,text,integer,integer,integer,date,text,text,text,text,text,text,text) from public;
grant execute on function public.create_salon_carnet_baleines_sale(text,text,integer,integer,integer,date,text,text,text,text,text,text,text) to service_role;
