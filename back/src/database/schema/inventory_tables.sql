create table public.inventory_receipts (
    id uuid not null default extensions.uuid_generate_v4(),
    supplier_id uuid not null,
    invoice_number character varying(150) not null,
    purchase_date date not null,
    total_amount numeric(14, 2) not null default 0,
    status character varying(30) not null default 'posted',
    notes text null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    created_by uuid null,
    updated_by uuid null,
    constraint inventory_receipts_pkey primary key (id),
    constraint inventory_receipts_supplier_id_fkey foreign key (supplier_id) references public.suppliers (id),
    constraint inventory_receipts_created_by_fkey foreign key (created_by) references public.profiles (id),
    constraint inventory_receipts_updated_by_fkey foreign key (updated_by) references public.profiles (id)
);
create unique index inventory_receipts_supplier_invoice_unique on public.inventory_receipts (supplier_id, invoice_number);
create table public.inventory_receipt_items (
    id uuid not null default extensions.uuid_generate_v4(),
    receipt_id uuid not null,
    product_id uuid not null,
    quantity numeric(14, 3) not null,
    unit_cost numeric(14, 2) not null default 0,
    line_total numeric(14, 2) not null default 0,
    created_at timestamp with time zone not null default now(),
    constraint inventory_receipt_items_pkey primary key (id),
    constraint inventory_receipt_items_receipt_id_fkey foreign key (receipt_id) references public.inventory_receipts (id) on delete cascade,
    constraint inventory_receipt_items_product_id_fkey foreign key (product_id) references public.products (id)
);
create trigger update_inventory_receipts_updated_at before
update on public.inventory_receipts for each row execute function update_updated_at_column();
create unique index inventory_receipt_items_receipt_product_unique on public.inventory_receipt_items (receipt_id, product_id);
create or replace function public.set_inventory_receipt_item_total() returns trigger language plpgsql as $$ begin new.line_total := coalesce(new.quantity, 0) * coalesce(new.unit_cost, 0);
return new;
end;
$$;
create trigger trg_set_inventory_receipt_item_total before
insert
    or
update on public.inventory_receipt_items for each row execute function public.set_inventory_receipt_item_total();
create or replace function public.recalc_inventory_receipt_total() returns trigger language plpgsql as $$
declare rid uuid;
begin rid := coalesce(new.receipt_id, old.receipt_id);
update public.inventory_receipts r
set total_amount = (
        select coalesce(sum(i.line_total), 0)
        from public.inventory_receipt_items i
        where i.receipt_id = rid
    )
where r.id = rid;
return null;
end;
$$;
create trigger trg_recalc_receipt_total_after_items
after
insert
    or
update
    or delete on public.inventory_receipt_items for each row execute function public.recalc_inventory_receipt_total();