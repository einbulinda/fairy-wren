-- Hourly revenue breakdown for a given date, used by dashboard "Today" chart.
CREATE OR REPLACE FUNCTION public.rpc_hourly_revenue(p_date date) RETURNS TABLE(
        hour integer,
        total_revenue numeric,
        total_orders bigint
    ) LANGUAGE sql STABLE AS $function$
select extract(hour from p.created_at)::integer as hour,
    sum(p.amount) as total_revenue,
    count(distinct p.bill_id) as total_orders
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) = p_date
group by extract(hour from p.created_at)
order by hour;
$function$;
