create or replace function public.create_salon_peche_sale_with_payment(
  p_offer_code text, p_price integer, p_prenom text, p_nom text, p_telephone text, p_email text,
  p_payment_method text, p_payment_reference text, p_commentaire text, p_nombre_personnes integer,
  p_date_sortie date, p_depart text, p_payment_type text
) returns table(sale_id uuid,item_id uuid,reservation_id uuid,right_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v record; v_paid integer;
begin
  if p_payment_type not in ('full','deposit')
    or (p_payment_type='deposit' and p_offer_code not like 'peche_privatisation_%'
      and p_offer_code not in ('peche_2_plus_1_demi_journee','peche_2_plus_1_journee')) then
    raise exception 'Type de paiement invalide' using errcode='22023';
  end if;
  v_paid := case when p_payment_type='deposit' then round(p_price*.30) else p_price end;
  select * into v from public.create_salon_peche_sale(p_offer_code,p_price,p_prenom,p_nom,p_telephone,p_email,p_payment_method,p_payment_reference,p_commentaire,p_nombre_personnes,p_date_sortie,p_depart);
  update public.salon_sales set montant_encaisse=v_paid,montant_solde=p_price-v_paid,statut=case when v_paid=p_price then 'invoice_pending' else 'partial' end where id=v.sale_id;
  if v.reservation_id is not null then
    update public.reservations_peche set montant_paye=v_paid,type_paiement=p_payment_type where id=v.reservation_id;
  else
    update public.salon_peche_rights set montant_paye=v_paid where id=v.right_id;
  end if;
  return query select v.sale_id,v.item_id,v.reservation_id,v.right_id;
end $$;

revoke all on function public.create_salon_peche_sale_with_payment(text,integer,text,text,text,text,text,text,text,integer,date,text,text) from public;
grant execute on function public.create_salon_peche_sale_with_payment(text,integer,text,text,text,text,text,text,text,integer,date,text,text) to service_role;

create or replace function public.create_salon_baleines_sale_with_payment(
  p_offer_code text, p_label text, p_composition jsonb, p_total integer, p_valid_until date,
  p_prenom text, p_nom text, p_telephone text, p_email text, p_payment_method text,
  p_payment_reference text, p_commentaire text, p_date_sortie date, p_depart text,
  p_participants jsonb, p_payment_type text
) returns table(sale_id uuid,item_id uuid,reservation_id uuid,right_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v record; v_paid integer;
begin
  if p_payment_type not in ('full','deposit') or (p_payment_type='deposit' and p_total<=0) then
    raise exception 'Type de paiement invalide' using errcode='22023';
  end if;
  v_paid := case when p_payment_type='deposit' then round(p_total*.30) else p_total end;
  select * into v from public.create_salon_baleines_sale(p_offer_code,p_label,p_composition,p_total,p_valid_until,p_prenom,p_nom,p_telephone,p_email,p_payment_method,p_payment_reference,p_commentaire,p_date_sortie,p_depart,p_participants);
  update public.salon_sales set montant_encaisse=v_paid,montant_solde=p_total-v_paid,statut=case when v_paid=p_total then 'invoice_pending' else 'partial' end where id=v.sale_id;
  if v.reservation_id is not null then
    update public.reservations_baleines set statut_paiement=case when p_payment_type='deposit' then 'deposit_paid' else 'paid' end where id=v.reservation_id;
  end if;
  return query select v.sale_id,v.item_id,v.reservation_id,v.right_id;
end $$;

revoke all on function public.create_salon_baleines_sale_with_payment(text,text,jsonb,integer,date,text,text,text,text,text,text,text,date,text,jsonb,text) from public;
grant execute on function public.create_salon_baleines_sale_with_payment(text,text,jsonb,integer,date,text,text,text,text,text,text,text,date,text,jsonb,text) to service_role;
