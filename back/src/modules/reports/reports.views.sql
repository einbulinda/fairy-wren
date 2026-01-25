/*
 1. Bill Line Totals
 */
create or replace view v_bill_item_totals as
select b.id as bill_id,
    sum(ri.price * ri.quantity) as computed_subtotal
from bills b
    join rounds r on r.bill_id = b.id
    join round_items ri on ri.round_id = r.id
group by b.id;
/*
 2. Bill Totals (Final Bill Value)
 */
create or replace view v_bill_totals as
select b.id as bill_id,
    coalesce(it.computed_subtotal, 0) as subtotal,
    b.tax as tax,
    coalesce(it.computed_subtotal, 0) + coalesce(b.tax, 0) as total
from bills b
    left join v_bill_item_totals it on it.bill_id = b.id;
/*
 3. Payment Summary Per Bill
 */
create or replace view v_bill_payments as
select bill_id,
    sum(amount) as paid_amount
from payments
where is_paid = true
group by bill_id;
/*
 4.BILL FINANCIAL STATUS (OUTSTANDING / PAID)
 */
create or replace view v_bill_financials as
select bt.bill_id,
    bt.total as bill_total,
    coalesce(bp.paid_amount, 0) as paid_amount,
    bt.total - coalesce(bp.paid_amount, 0) as outstanding_amount
from v_bill_totals bt
    left join v_bill_payments bp on bp.bill_id = bt.bill_id;
/*
 5.REVENUE BY DAY (DASHBOARD CORE)
 */
create or replace view v_daily_revenue as
select date(p.created_at) as business_date,
    sum(p.amount) as total_revenue
from payments p
where p.is_paid = true
group by date(p.created_at);
/*
 6.PAYMENT TYPE BREAKDOWN (CASH VS MPESA)
 */
create or replace view v_payment_type_summary as
select date(created_at) as business_date,
    payment_type,
    sum(amount) as total_amount
from payments
where is_paid = true
group by date(created_at),
    payment_type;
/*
 7.AVERAGE BILL VALUE (ACCURATE)
 */
create or replace view v_avg_bill_value as
select avg(bt.total) as avg_bill_value
from v_bill_totals bt;
/*
 8.CATEGORY SALES PERFORMANCE
 */
create or replace view v_category_sales as
select c.id as category_id,
    c.name as category_name,
    sum(ri.quantity) as total_quantity,
    sum(ri.price * ri.quantity) as total_sales
from round_items ri
    join rounds r on r.id = ri.round_id
    join bills b on b.id = r.bill_id
    join products p on p.id = ri.product_id
    join categories c on c.id = p.category_id
where b.status = 'completed'
group by c.id,
    c.name;
/* RPC FOR DATE RANGES*/
/*
 1.DAILY REVENUE (DATE RANGE)
 */
create or replace function rpc_daily_revenue(p_start_date date, p_end_date date) returns table (
        business_date date,
        total_revenue numeric(12, 2)
    ) language sql stable as $$
select date(p.created_at) as business_date,
    sum(p.amount) as total_revenue
from payments p
where p.is_paid = true
    and date(p.created_at) between p_start_date and p_end_date
group by date(p.created_at)
order by business_date;
$$;
/*
 2.PAYMENT TYPE BREAKDOWN (CASH / MPESA)
 */
create or replace function rpc_payment_type_summary(p_start_date date, p_end_date date) returns table (
        payment_type varchar,
        total_amount numeric(12, 2)
    ) language sql stable as $$
select payment_type,
    sum(amount) as total_amount
from payments
where is_paid = true
    and date(created_at) between p_start_date and p_end_date
group by payment_type
order by payment_type;
$$;
/*
 3.TOTAL REVENUE (SINGLE NUMBER KPI)
 */
create or replace function rpc_total_revenue(p_start_date date, p_end_date date) returns numeric(12, 2) language sql stable as $$
select coalesce(sum(amount), 0)
from payments
where is_paid = true
    and date(created_at) between p_start_date and p_end_date;
$$;
/*
 4.AVERAGE BILL VALUE (DATE RANGE SAFE)
 */
create or replace function rpc_avg_bill_value(p_start_date date, p_end_date date) returns numeric(12, 2) language sql stable as $$
select avg(bt.total)
from v_bill_totals bt
    join bills b on b.id = bt.bill_id
where date(b.created_at) between p_start_date and p_end_date
    and b.status = 'completed';
$$;
/*
 5.OUTSTANDING BILLS (DATE RANGE)
 */
create or replace function rpc_outstanding_bills(p_start_date date, p_end_date date) returns table (
        bill_id uuid,
        bill_total numeric(12, 2),
        paid_amount numeric(12, 2),
        outstanding_amount numeric(12, 2)
    ) language sql stable as $$
select bf.bill_id,
    bf.bill_total,
    bf.paid_amount,
    bf.outstanding_amount
from v_bill_financials bf
    join bills b on b.id = bf.bill_id
where date(b.created_at) between p_start_date and p_end_date
    and bf.outstanding_amount > 0
order by outstanding_amount desc;
$$;
/*
 6.CATEGORY SALES (DATE RANGE)
 */
create or replace function rpc_category_sales(p_start_date date, p_end_date date) returns table (
        category_id uuid,
        category_name varchar,
        total_quantity integer,
        total_sales numeric(12, 2)
    ) language sql stable as $$
select c.id,
    c.name,
    sum(ri.quantity) as total_quantity,
    sum(ri.price * ri.quantity) as total_sales
from round_items ri
    join rounds r on r.id = ri.round_id
    join bills b on b.id = r.bill_id
    join products p on p.id = ri.product_id
    join categories c on c.id = p.category_id
where b.status = 'completed'
    and date(b.created_at) between p_start_date and p_end_date
group by c.id,
    c.name
order by total_sales desc;
$$;
/*
 INDEXING
 */
create index if not exists idx_payments_paid_date on payments (is_paid, created_at);
create index if not exists idx_bills_created_at on bills (created_at);