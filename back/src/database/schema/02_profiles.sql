-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    pin VARCHAR(6) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN ('waitress', 'bartender', 'manager', 'owner')
    ),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Index for faster PIN lookups
CREATE INDEX idx_profiles_pin ON profiles(pin);
CREATE INDEX idx_profiles_role ON profiles(role);