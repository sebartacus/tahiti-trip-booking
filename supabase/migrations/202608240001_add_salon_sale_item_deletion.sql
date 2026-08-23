create or replace function public.admin_delete_salon_sale_item(
  p_sale_id uuid,
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.salon_sale_items%rowtype;
  v_invoice_path text;
  v_remaining integer;
  v_total integer;
  v_paid integer;
  v_carnet public.carnets_baleines%rowtype;
begin
  select * into v_item
  from public.salon_sale_items
  where id = p_item_id and sale_id = p_sale_id
  for update;

  if not found then
    return jsonb_build_object('deleted', false, 'reason', 'not_found');
  end if;

  if v_item.activity not in ('permis', 'carnet_baleines') then
    raise exception 'Ce type de vente Salon ne peut pas être supprimé ici.' using errcode = '22023';
  end if;

  select facture_url into v_invoice_path
  from public.salon_sales
  where id = p_sale_id
  for update;

  if v_item.activity = 'carnet_baleines' then
    select * into v_carnet
    from public.carnets_baleines
    where id = v_item.reservation_id::uuid
    for update;

    if not found then
      raise exception 'Le carnet lié à cette vente est introuvable.' using errcode = '23503';
    end if;

    if v_carnet.credits_restants <> v_carnet.credits_initiaux
      or exists (
        select 1 from public.mouvements_carnets_baleines
        where carnet_id = v_carnet.id
          and (reservation_id is not null or mouvement < 0)
      ) then
      raise exception 'Ce carnet a déjà été utilisé et ne peut pas être supprimé.' using errcode = 'P0001';
    end if;

    delete from public.mouvements_carnets_baleines where carnet_id = v_carnet.id;
    delete from public.carnets_baleines where id = v_carnet.id;
  else
    delete from public.reservations where id::text = v_item.reservation_id;
  end if;

  delete from public.salon_sale_items where id = v_item.id;

  select count(*), coalesce(sum(total_price), 0)
  into v_remaining, v_total
  from public.salon_sale_items
  where sale_id = p_sale_id;

  if v_remaining = 0 then
    delete from public.salon_sales where id = p_sale_id;
  else
    update public.reservations
    set facture_numero = null, facture_url = null
    where id::text in (
      select reservation_id from public.salon_sale_items
      where sale_id = p_sale_id and activity = 'permis'
    );

    update public.carnets_baleines
    set facture_numero = null, facture_url = null
    where id::text in (
      select reservation_id from public.salon_sale_items
      where sale_id = p_sale_id and activity = 'carnet_baleines'
    );

    select least(montant_encaisse, v_total) into v_paid
    from public.salon_sales where id = p_sale_id;

    update public.salon_sales
    set montant_total = v_total,
        montant_encaisse = v_paid,
        montant_solde = v_total - v_paid,
        statut = case when v_paid = v_total then 'paid' when v_paid > 0 then 'partial' else 'invoice_pending' end,
        facture_numero = null,
        facture_url = null,
        facture_generee_at = null,
        facture_envoyee_at = null
    where id = p_sale_id;
  end if;

  return jsonb_build_object(
    'deleted', true,
    'saleDeleted', v_remaining = 0,
    'invoicePath', v_invoice_path
  );
end;
$$;

revoke all on function public.admin_delete_salon_sale_item(uuid, uuid) from public;
grant execute on function public.admin_delete_salon_sale_item(uuid, uuid) to service_role;
