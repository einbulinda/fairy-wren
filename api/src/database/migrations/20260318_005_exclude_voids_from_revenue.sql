-- Exclude voided bills from revenue reporting functions.
-- Previously, rpc_daily_revenue, rpc_total_revenue, and rpc_payment_type_summary
-- only filtered on is_paid=true but didn't check bill status, so payments from
-- voided bills were still counted as revenue.

CREATE OR REPLACE FUNCTION public.rpc_daily_revenue(p_start_date date, p_end_date date) RETURNS TABLE(
        business_date date,
        total_revenue numeric,
        total_orders bigint
    ) LANGUAGE sql STABLE AS $function$
select date(p.created_at) as business_date,
    sum(p.amount) as total_revenue,
    count(distinct p.bill_id) as total_orders
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date
group by date(p.created_at)
order by business_date;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_total_revenue(p_start_date date, p_end_date date) RETURNS numeric LANGUAGE sql STABLE AS $function$
select coalesce(sum(p.amount), 0)
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_payment_type_summary(p_start_date date, p_end_date date) RETURNS TABLE(
        payment_type character varying,
        total_amount numeric,
        count bigint
    ) LANGUAGE sql STABLE AS $function$
select p.payment_type,
    sum(p.amount) as total_amount,
    count(*) as count
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date
group by p.payment_type
order by p.payment_type;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_outstanding_bills(p_start_date date, p_end_date date) RETURNS TABLE(
        bill_id uuid,
        bill_total numeric,
        paid_amount numeric,
        outstanding_amount numeric,
        customer_name text,
        served_by text,
        created_at timestamp with time zone
    ) LANGUAGE sql STABLE AS $function$
select bf.bill_id,
    bf.bill_total,
    bf.paid_amount,
    bf.outstanding_amount,
    b.customer_name,
    p.name as served_by,
    b.created_at
from v_bill_financials bf
    join bills b on b.id = bf.bill_id
    left join profiles p on p.id = b.created_by
where date(b.created_at) between p_start_date and p_end_date
    and b.status != 'void'
    and bf.outstanding_amount > 0
order by outstanding_amount desc;
$function$;
