-- Complete CRM Database Schema for VPS Deployment
-- This file contains all tables, types, functions, policies, and data needed for the CRM application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('staff', 'superadmin');
CREATE TYPE lead_status AS ENUM (
    'new', 'contacted', 'interested', 'not_interested', 'potential', 
    'not_attended', 'busy_call_back', 'pay_later', 'qualified', 
    'proposal', 'negotiation', 'closed_won', 'closed_lost'
);
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create auth schema and users table (if not using Supabase auth)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    confirmation_token TEXT,
    confirmation_sent_at TIMESTAMPTZ,
    recovery_token TEXT,
    recovery_sent_at TIMESTAMPTZ,
    email_change_token_new TEXT,
    email_change TEXT,
    email_change_sent_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    phone TEXT,
    phone_confirmed_at TIMESTAMPTZ,
    phone_change TEXT,
    phone_change_token TEXT,
    phone_change_sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current TEXT DEFAULT '',
    email_change_confirm_status SMALLINT DEFAULT 0,
    banned_until TIMESTAMPTZ,
    reauthentication_token TEXT DEFAULT '',
    reauthentication_sent_at TIMESTAMPTZ,
    is_sso_user BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- Create auth helper functions
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.sub', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )::uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    )::text;
$$ LANGUAGE SQL STABLE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    status lead_status DEFAULT 'new',
    notes TEXT,
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_assignments table
CREATE TABLE IF NOT EXISTS campaign_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, staff_id)
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    notes TEXT,
    converted_at TIMESTAMPTZ DEFAULT NOW(),
    converted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_date DATE,
    due_date DATE,
    status payment_status DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_status_history table
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    old_status lead_status,
    new_status lead_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign_id ON campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_staff_id ON campaign_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_converted_by ON customers(converted_by);
CREATE INDEX IF NOT EXISTS idx_customers_converted_at ON customers(converted_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_by ON lead_status_history(changed_by);

-- Create helper functions
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'superadmin'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can read own profile and superadmins can read all" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Campaigns policies
CREATE POLICY "Superadmins can manage all campaigns" ON campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Staff can read assigned campaigns" ON campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_assignments 
            WHERE campaign_id = campaigns.id AND staff_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Leads policies
CREATE POLICY "Superadmins can manage all leads" ON leads
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Staff can read and update assigned leads" ON leads
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM campaign_assignments 
            WHERE campaign_id = leads.campaign_id AND staff_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Staff can update assigned leads" ON leads
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM campaign_assignments 
            WHERE campaign_id = leads.campaign_id AND staff_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    )
    WITH CHECK (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM campaign_assignments 
            WHERE campaign_id = leads.campaign_id AND staff_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Campaign assignments policies
CREATE POLICY "Superadmins can manage all assignments" ON campaign_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Staff can read own assignments" ON campaign_assignments
    FOR SELECT USING (
        staff_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Customers policies
CREATE POLICY "Allow customer creation and access" ON customers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') OR
        converted_by = auth.uid()
    );

CREATE POLICY "Staff and superadmin customer access" ON customers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') OR
        converted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = customers.lead_id AND leads.assigned_to = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM leads
            JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
            WHERE leads.id = customers.lead_id AND campaign_assignments.staff_id = auth.uid()
        )
    );

CREATE POLICY "Staff can update customers they have access to" ON customers
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') OR
        converted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = customers.lead_id AND leads.assigned_to = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM leads
            JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
            WHERE leads.id = customers.lead_id AND campaign_assignments.staff_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') OR
        converted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = customers.lead_id AND leads.assigned_to = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM leads
            JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
            WHERE leads.id = customers.lead_id AND campaign_assignments.staff_id = auth.uid()
        )
    );

CREATE POLICY "Staff can delete customers they have access to" ON customers
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') OR
        converted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = customers.lead_id AND leads.assigned_to = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM leads
            JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
            WHERE leads.id = customers.lead_id AND campaign_assignments.staff_id = auth.uid()
        )
    );

-- Payments policies
CREATE POLICY "Superadmins can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Staff can manage payments for their customers" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM customers
            JOIN leads ON leads.id = customers.lead_id
            WHERE customers.id = payments.customer_id AND (
                leads.assigned_to = auth.uid() OR
                customers.converted_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM campaign_assignments 
                    WHERE campaign_assignments.campaign_id = leads.campaign_id 
                    AND campaign_assignments.staff_id = auth.uid()
                )
            )
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            JOIN leads ON leads.id = customers.lead_id
            WHERE customers.id = payments.customer_id AND (
                leads.assigned_to = auth.uid() OR
                customers.converted_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM campaign_assignments 
                    WHERE campaign_assignments.campaign_id = leads.campaign_id 
                    AND campaign_assignments.staff_id = auth.uid()
                )
            )
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Lead status history policies
CREATE POLICY "Users can insert lead history" ON lead_status_history
    FOR INSERT WITH CHECK (changed_by = auth.uid());

CREATE POLICY "Users can read lead history they have access to" ON lead_status_history
    FOR SELECT USING (
        changed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = lead_status_history.lead_id AND leads.assigned_to = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM leads
            JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
            WHERE leads.id = lead_status_history.lead_id AND campaign_assignments.staff_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Insert sample data (optional - remove if not needed)

-- Sample superadmin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
    'ca3fdfa0-0833-4a4d-aa35-2eec33da0226',
    'admin@metahire.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Admin User", "role": "superadmin"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Sample staff user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
    'staff-user-id-1234567890123456',
    'staff@metahire.com',
    crypt('staff123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Staff User", "role": "staff"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Sample profiles (will be created automatically by trigger, but adding manually for completeness)
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES 
    ('ca3fdfa0-0833-4a4d-aa35-2eec33da0226', 'admin@metahire.com', 'Admin User', 'superadmin', NOW(), NOW()),
    ('staff-user-id-1234567890123456', 'staff@metahire.com', 'Staff User', 'staff', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Sample campaign
INSERT INTO campaigns (id, name, description, status, created_by, created_at, updated_at)
VALUES (
    'campaign-id-1234567890123456',
    'Test Campaign',
    'Sample campaign for testing',
    'active',
    'ca3fdfa0-0833-4a4d-aa35-2eec33da0226',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sample campaign assignment
INSERT INTO campaign_assignments (campaign_id, staff_id, assigned_by, assigned_at)
VALUES (
    'campaign-id-1234567890123456',
    'staff-user-id-1234567890123456',
    'ca3fdfa0-0833-4a4d-aa35-2eec33da0226',
    NOW()
) ON CONFLICT (campaign_id, staff_id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT ALL ON auth.users TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Create roles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END
$$;

COMMENT ON DATABASE postgres IS 'Pixmate CRM Database - Complete schema with all tables, policies, and sample data';