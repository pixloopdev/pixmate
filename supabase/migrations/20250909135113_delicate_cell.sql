-- MetaHire CRM SQLite Database Schema
-- Complete schema for SQLite deployment

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Create users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('staff', 'superadmin')) DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES profiles(id)
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    campaign_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    status TEXT CHECK (status IN (
        'new', 'contacted', 'interested', 'not_interested', 'potential', 
        'not_attended', 'busy_call_back', 'pay_later', 'qualified', 
        'proposal', 'negotiation', 'closed_won', 'closed_lost'
    )) DEFAULT 'new',
    notes TEXT,
    assigned_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id)
);

-- Create campaign_assignments table
CREATE TABLE IF NOT EXISTS campaign_assignments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    campaign_id TEXT,
    staff_id TEXT,
    assigned_by TEXT,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES profiles(id),
    UNIQUE(campaign_id, staff_id)
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    notes TEXT,
    converted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    converted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (converted_by) REFERENCES profiles(id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    customer_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_date DATE,
    due_date DATE,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES profiles(id)
);

-- Create lead_status_history table
CREATE TABLE IF NOT EXISTS lead_status_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_converted_at ON customers(converted_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_staff_id ON campaign_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign_id ON campaign_assignments(campaign_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at 
    AFTER UPDATE ON profiles
    BEGIN
        UPDATE profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_campaigns_updated_at 
    AFTER UPDATE ON campaigns
    BEGIN
        UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_leads_updated_at 
    AFTER UPDATE ON leads
    BEGIN
        UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_customers_updated_at 
    AFTER UPDATE ON customers
    BEGIN
        UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_payments_updated_at 
    AFTER UPDATE ON payments
    BEGIN
        UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert sample data
-- Create admin user
INSERT OR IGNORE INTO users (id, email, password_hash) VALUES 
('admin-id-123', 'admin@metahire.com', '$2b$10$example.hash.for.admin123');

INSERT OR IGNORE INTO profiles (id, email, full_name, role) VALUES 
('admin-id-123', 'admin@metahire.com', 'Admin User', 'superadmin');

-- Create staff user
INSERT OR IGNORE INTO users (id, email, password_hash) VALUES 
('staff-id-456', 'staff@metahire.com', '$2b$10$example.hash.for.staff123');

INSERT OR IGNORE INTO profiles (id, email, full_name, role) VALUES 
('staff-id-456', 'staff@metahire.com', 'Staff User', 'staff');

-- Create sample campaign
INSERT OR IGNORE INTO campaigns (id, name, description, created_by) VALUES 
('campaign-test-789', 'Test Campaign', 'Sample campaign for testing', 'admin-id-123');

-- Assign campaign to staff
INSERT OR IGNORE INTO campaign_assignments (campaign_id, staff_id, assigned_by) VALUES 
('campaign-test-789', 'staff-id-456', 'admin-id-123');

-- Create sample lead
INSERT OR IGNORE INTO leads (id, campaign_id, first_name, last_name, email, phone, company, position, assigned_to) VALUES 
('lead-sample-101', 'campaign-test-789', 'John', 'Doe', 'john.doe@example.com', '+1234567890', 'Sample Corp', 'Manager', 'staff-id-456');