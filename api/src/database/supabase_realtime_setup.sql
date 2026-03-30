-- Enable real-time for bills table
alter publication supabase_realtime add table bills;

-- Enable real-time for payments table
alter publication supabase_realtime add table payments;

-- Enable real-time for products table (for stock updates)
alter publication supabase_realtime add table products;

-- Enable real-time for rounds table (for round creation)
alter publication supabase_realtime add table rounds;

-- Enable real-time for stock_takes table (for approval workflow)
alter publication supabase_realtime add table stock_takes;

-- Verify tables are in the publication
select 
  schemaname,
  tablename,
  pubname
from pg_publication_tables 
where pubname = 'supabase_realtime';
