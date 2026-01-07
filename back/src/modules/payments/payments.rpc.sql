create or replace function confirm_bill_and_payments(
        p_bill_id uuid,
        p_user_id uuid,
        p_payment_mode character varying(20) default null
    ) returns void language plpgsql as $$
declare v_bill_total numeric;
v_payment_total numeric;
begin -- Validate payment mode if provided
if p_payment_mode is not null
and p_payment_mode not in ('cash', 'mpesa') then raise exception 'Invalid payment mode: %',
p_payment_mode;
end if;
-- Lock bill row
select total into v_bill_total
from bills
where id = p_bill_id for
update;
if not found then raise exception 'Bill not found';
end if;
-- Prevent double confirmation
if exists (
    select 1
    from bills
    where id = p_bill_id
        and status = 'completed'
) then raise exception 'Bill already completed';
end if;
-- Calculate total payments (paid or unpaid)
select coalesce(sum(amount), 0) into v_payment_total
from payments
where bill_id = p_bill_id;
if v_payment_total = 0 then raise exception 'No payments recorded for bill';
end if;
-- Enforce full settlement
if v_payment_total <> v_bill_total then raise exception 'Payment total (%) does not match bill total (%)',
v_payment_total,
v_bill_total;
end if;
-- Mark bill as completed
update bills
set status = 'completed',
    updated_at = now(),
    updated_by = p_user_id
where id = p_bill_id;
-- Finalize payments
update payments
set is_paid = true,
    payment_type = coalesce(payment_type, p_payment_mode),
    updated_at = now(),
    updated_by = p_user_id
where bill_id = p_bill_id;
end;
$$;