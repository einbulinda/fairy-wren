-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
-- Profiles: Users can read all, but only owners can modify
CREATE POLICY "Anyone can read profiles" ON profiles FOR
SELECT USING (true);
CREATE POLICY "Only owners can modify profiles" ON profiles FOR ALL USING (
    auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- Bills: Waitresses can only see their own open bills, bartenders and managers see all
CREATE POLICY "Waitresses see own bills" ON bills FOR
SELECT USING (
        waitress_id = auth.uid()
        OR auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('bartender', 'manager', 'owner')
        )
    );
CREATE POLICY "Waitresses can create bills" ON bills FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('waitress', 'bartender', 'owner')
        )
    );
CREATE POLICY "Waitresses can update own bills" ON bills FOR
UPDATE USING (
        waitress_id = auth.uid()
        OR auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role IN ('bartender', 'manager', 'owner')
        )
    );
-- Products: Everyone can read, only managers/owners can modify
CREATE POLICY "Anyone can read products" ON products FOR
SELECT USING (active = true);
CREATE POLICY "Only managers can modify products" ON products FOR ALL USING (
    auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role IN ('manager', 'owner')
    )
);