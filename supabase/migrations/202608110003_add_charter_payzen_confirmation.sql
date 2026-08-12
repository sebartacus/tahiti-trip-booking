alter table public.reservations_charter
  add column if not exists transaction_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists facture_numero text,
  add column if not exists facture_url text,
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamptz,
  add column if not exists customer_email_sent boolean not null default false,
  add column if not exists internal_email_sent boolean not null default false,
  add column if not exists payment_error text,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivery_claimed_at timestamptz;

create unique index if not exists reservations_charter_transaction_id_uidx
  on public.reservations_charter (transaction_id)
  where transaction_id is not null;

alter table public.reservations_charter
  add constraint reservations_charter_delivery_status_check
    check (delivery_status in ('pending', 'processing', 'sent', 'failed'));

create or replace function public.confirm_charter_payment(
  p_reservation_id uuid,
  p_transaction_id text,
  p_amount integer,
  p_paid_at timestamptz default now()
)
returns table (
  success boolean,
  already_processed boolean,
  error_code text,
  confirmed_slots integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations_charter%rowtype;
  v_expected_slots integer;
  v_valid_holds integer;
  v_confirmed integer;
begin
  if p_reservation_id is null or coalesce(trim(p_transaction_id), '') = '' or p_amount <= 0 then
    raise exception 'Parametres de confirmation Charter invalides' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('charter-payment:' || p_reservation_id::text, 0));

  select * into v_reservation
  from public.reservations_charter
  where id = p_reservation_id
  for update;

  if not found then
    return query select false, false, 'reservation_not_found'::text, 0;
    return;
  end if;

  if v_reservation.paye then
    if v_reservation.transaction_id = p_transaction_id
       and v_reservation.montant_paye = p_amount then
      select count(*)::integer into v_confirmed
      from public.boat_calendar_slots
      where reservation_id = p_reservation_id
        and reservation_table = 'reservations_charter'
        and activity = 'charter'
        and status = 'reserved';
      return query select true, true, null::text, v_confirmed;
    else
      return query select false, false, 'payment_already_assigned'::text, 0;
    end if;
    return;
  end if;

  if v_reservation.statut_paiement <> 'pending' then
    return query select false, false, 'reservation_not_pending'::text, 0;
    return;
  end if;

  if v_reservation.montant_paye <> p_amount then
    return query select false, false, 'amount_mismatch'::text, 0;
    return;
  end if;

  v_expected_slots := case v_reservation.formule
    when 'tetiaroa_2j_1n' then 4
    when 'tetiaroa_3j_2n' then 6
    when 'moorea_matin' then 1
    when 'moorea_journee' then 2
    when 'sunset' then 1
    else 0
  end;

  select count(*)::integer into v_valid_holds
  from public.boat_calendar_slots
  where reservation_id = p_reservation_id
    and reservation_table = 'reservations_charter'
    and activity = 'charter'
    and status = 'hold'
    and expires_at > clock_timestamp();

  if v_valid_holds <> v_expected_slots then
    return query select false, false, 'hold_expired_or_incomplete'::text, v_valid_holds;
    return;
  end if;

  update public.boat_calendar_slots
  set status = 'reserved', expires_at = null
  where reservation_id = p_reservation_id
    and reservation_table = 'reservations_charter'
    and activity = 'charter'
    and status = 'hold'
    and expires_at > clock_timestamp();

  get diagnostics v_confirmed = row_count;
  if v_confirmed <> v_expected_slots then
    raise exception 'La confirmation atomique des slots Charter a echoue'
      using errcode = '40001';
  end if;

  update public.reservations_charter
  set paye = true,
      statut_paiement = 'paid',
      transaction_id = p_transaction_id,
      paid_at = p_paid_at,
      montant_solde = case when type_paiement = 'full' then 0 else montant_solde end,
      payment_error = null
  where id = p_reservation_id;

  return query select true, false, null::text, v_confirmed;
end;
$$;

create or replace function public.fail_charter_payment(
  p_reservation_id uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paid boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('charter-payment:' || p_reservation_id::text, 0));

  select paye into v_paid
  from public.reservations_charter
  where id = p_reservation_id
  for update;

  if not found or v_paid then
    return false;
  end if;

  update public.reservations_charter
  set statut_paiement = 'failed', payment_error = nullif(trim(p_error), '')
  where id = p_reservation_id;

  update public.boat_calendar_slots
  set status = 'available', activity = null, reservation_id = null,
      reservation_table = null, expires_at = null, blocked_reason = null,
      blocked_by = null, blocked_at = null
  where reservation_id = p_reservation_id
    and reservation_table = 'reservations_charter'
    and activity = 'charter'
    and status = 'hold';

  return true;
end;
$$;

create or replace function public.claim_charter_delivery(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claimed integer;
begin
  update public.reservations_charter
  set delivery_status = 'processing', delivery_claimed_at = now()
  where id = p_reservation_id
    and paye = true
    and email_sent = false
    and (
      delivery_status in ('pending', 'failed')
      or (delivery_status = 'processing' and delivery_claimed_at < now() - interval '15 minutes')
    );
  get diagnostics v_claimed = row_count;
  return v_claimed = 1;
end;
$$;

revoke all on function public.confirm_charter_payment(uuid, text, integer, timestamptz) from public;
revoke all on function public.fail_charter_payment(uuid, text) from public;
revoke all on function public.claim_charter_delivery(uuid) from public;

grant execute on function public.confirm_charter_payment(uuid, text, integer, timestamptz) to service_role;
grant execute on function public.fail_charter_payment(uuid, text) to service_role;
grant execute on function public.claim_charter_delivery(uuid) to service_role;

comment on function public.confirm_charter_payment(uuid, text, integer, timestamptz)
  is 'Confirme atomiquement un paiement Charter et tous ses slots encore sous hold actif.';
