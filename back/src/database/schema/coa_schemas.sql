drop table if exists public.chart_of_accounts cascade;
create table public.chart_of_accounts (
    id uuid not null default extensions.uuid_generate_v4 (),
    code varchar(20) not null,
    name varchar(150) not null,
    -- High-level classification
    account_class text not null,
    -- Hierarchy
    parent_id uuid null,
    active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint chart_of_accounts_pkey primary key (id),
    constraint chart_of_accounts_code_key unique (code),
    constraint chart_of_accounts_parent_fk foreign key (parent_id) references chart_of_accounts (id),
    constraint chart_of_accounts_class_check check (
        account_class in (
            'asset',
            'liability',
            'equity',
            'income',
            'expense',
            'cost_of_sales'
        )
    )
);
--Hierarchy Integrity
create or replace function validate_account_hierarchy() returns trigger as $$ begin if new.parent_id is not null then if not exists (
        select 1
        from chart_of_accounts p
        where p.id = new.parent_id
            and p.account_class = new.account_class
    ) then raise exception 'Parent account must be of the same account_class';
end if;
end if;
return new;
end;
$$ language plpgsql;
create trigger trg_validate_account_hierarchy before
insert
    or
update on chart_of_accounts for each row execute function validate_account_hierarchy();
-- General Ledger 
-- Journal Entries Header
create table public.journal_entries (
    id uuid default extensions.uuid_generate_v4 (),
    entry_date date not null,
    reference text null,
    description text null,
    created_at timestamptz default now(),
    constraint journal_entries_pkey primary key (id)
);
-- Journal Details Table
create table public.journal_lines (
    id uuid default extensions.uuid_generate_v4 (),
    journal_entry_id uuid not null,
    account_id uuid not null,
    debit numeric(12, 2) default 0,
    credit numeric(12, 2) default 0,
    constraint journal_lines_pkey primary key (id),
    constraint journal_lines_entry_fk foreign key (journal_entry_id) references journal_entries (id),
    constraint journal_lines_account_fk foreign key (account_id) references chart_of_accounts (id),
    constraint journal_lines_debit_credit_check check (
        (
            debit > 0
            and credit = 0
        )
        or (
            credit > 0
            and debit = 0
        )
    )
);
-- Balance Enforcement
create or replace function validate_journal_balance() returns trigger as $$
declare total_debit numeric;
total_credit numeric;
begin
select sum(debit),
    sum(credit) into total_debit,
    total_credit
from journal_lines
where journal_entry_id = new.journal_entry_id;
if total_debit <> total_credit then raise exception 'Journal entry is not balanced';
end if;
return new;
end;
$$ language plpgsql;
create trigger trg_validate_journal_balance
after
insert
    or
update on journal_lines for each row execute function validate_journal_balance();
--drop expenses table if exists
drop table expenses cascade;
-- Expense Table ALigned
create table public.expenses (
    id uuid default extensions.uuid_generate_v4 (),
    expense_date date not null,
    account_id uuid not null,
    -- must be EXPENSE account
    supplier_id uuid null,
    description text null,
    invoice_number varchar(100) null,
    amount numeric(12, 2) not null,
    created_at timestamptz default now(),
    constraint expenses_pkey primary key (id),
    constraint expenses_account_fk foreign key (account_id) references chart_of_accounts (id),
    constraint expenses_amount_check check (amount > 0)
);
--expenses account enforcement
create or replace function validate_expense_account() returns trigger as $$ begin if not exists (
        select 1
        from chart_of_accounts
        where id = new.account_id
            and account_class = 'expense'
            and active = true
    ) then raise exception 'Expenses must use an active expense account';
end if;
return new;
end;
$$ language plpgsql;
create trigger trg_validate_expense_account before
insert
    or
update on expenses for each row execute function validate_expense_account();
-- Revenue Posting 
create table public.sales (
    id uuid default extensions.uuid_generate_v4 (),
    sale_date date not null,
    revenue_account_id uuid not null,
    amount numeric(12, 2) not null,
    created_at timestamptz default now(),
    constraint sales_pkey primary key (id),
    constraint sales_revenue_account_fk foreign key (revenue_account_id) references chart_of_accounts (id),
    constraint sales_amount_check check (amount > 0)
);
--Revenue Account Validation
create or replace function validate_revenue_account() returns trigger as $$ begin if not exists (
        select 1
        from chart_of_accounts
        where id = new.revenue_account_id
            and account_class = 'income'
            and active = true
    ) then raise exception 'Sales must post to an active revenue account';
end if;
return new;
end;
$$ language plpgsql;
create trigger trg_validate_sales_account before
insert
    or
update on sales for each row execute function validate_revenue_account();
-- inventory Items
create table public.inventory_items (
    id uuid default extensions.uuid_generate_v4 (),
    name varchar(150) not null,
    inventory_account_id uuid not null,
    cogs_account_id uuid not null,
    cost_price numeric(12, 2) not null,
    constraint inventory_items_pkey primary key (id),
    constraint inventory_asset_fk foreign key (inventory_account_id) references chart_of_accounts (id),
    constraint inventory_cogs_fk foreign key (cogs_account_id) references chart_of_accounts (id)
);
--inventory Items
create table public.inventory_movements (
    id uuid default extensions.uuid_generate_v4 (),
    item_id uuid not null,
    movement_date date not null,
    quantity numeric(12, 2) not null,
    movement_type text not null,
    -- purchase / sale
    created_at timestamptz default now(),
    constraint inventory_movements_pkey primary key (id),
    constraint inventory_movements_item_fk foreign key (item_id) references inventory_items (id),
    constraint inventory_movements_type_check check (movement_type in ('purchase', 'sale'))
);