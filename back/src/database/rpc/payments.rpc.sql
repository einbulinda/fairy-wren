create or replace function public.process_payment(
        p_bill_id uuid,
        p_amount numeric,
        p_payment_type varchar,
        p_user_id uuid,
        p_user_role varchar
    ) returns json language plpgsql as $$
declare v_bill record;
v_payment record;
begin -- Lock bill row
select * into v_bill
from bills
where id = p_bill_id for
update;
if not found then raise exception 'Bill not found';
end if;
if v_bill.status = 'completed' then raise exception 'Bill already completed';
end if;
-- if p_amount <> v_bill.total_amount then raise exception 'Only full payment is allowed';
-- end if;
-- Fetch existing payment (if any)
select * into v_payment
from payments
where bill_id = p_bill_id
    and status in ('pending', 'confirmed') for
update;
/* ===============================
 CASE 1: NON-BARTENDER INITIATES
 =============================== */
if p_user_role <> 'bartender' then if v_bill.status <> 'open'
or v_payment.id is not null then raise exception 'Payment already initiated or bill not open';
end if;
insert into payments (
        bill_id,
        amount,
        payment_type,
        status,
        created_by
    )
values (
        p_bill_id,
        p_amount,
        p_payment_type,
        'pending',
        p_user_id
    );
update bills
set status = 'awaiting_confirmation'
where id = p_bill_id;
return json_build_object(
    'status',
    'pending',
    'message',
    'Payment awaiting bartender confirmation'
);
end if;
/* ===============================
 CASE 2: BARTENDER CONFIRMS
 =============================== */
if p_user_role = 'bartender'
and v_payment.id is not null
and v_payment.status = 'pending'
and v_bill.status = 'awaiting_confirmation' then
update payments
set status = 'confirmed',
    updated_by = p_user_id,
    updated_at = now()
where id = v_payment.id;
update bills
set status = 'completed'
where id = p_bill_id;
return json_build_object(
    'status',
    'confirmed',
    'message',
    'Payment confirmed and bill completed'
);
end if;
/* ===============================
 CASE 3: BARTENDER DIRECT PAY
 =============================== */
if p_user_role = 'bartender'
and v_payment.id is null
and v_bill.status = 'open' then
insert into payments (
        bill_id,
        amount,
        payment_type,
        status,
        created_by,
        updated_by
    )
values (
        p_bill_id,
        p_amount,
        p_payment_type,
        'confirmed',
        p_user_id,
        p_user_id
    );
update bills
set status = 'completed'
where id = p_bill_id;
return json_build_object(
    'status',
    'confirmed',
    'message',
    'Direct payment completed'
);
end if;
raise exception 'Invalid payment state or role';
end;
$$;