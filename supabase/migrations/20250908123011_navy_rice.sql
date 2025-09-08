/*
  # Metahire CRM Database Schema

  1. New Tables
    - `profiles` - User profile information with roles (superadmin/staff)
    - `campaigns` - Marketing campaigns created by superadmin
    - `leads` - Lead information uploaded via CSV
    - `campaign_assignments` - Staff assignments to campaigns
    - `lead_assignments` - Individual lead assignments to staff
    - `lead_status_history` - Track status changes for leads

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Superadmin can access everything
    - Staff can only access assigned campaigns and leads

  3. Functions
    - Function to assign demo roles after user registration
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('superadmin', 'staff');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

-- Profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role user_role DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  status lead_status DEFAULT 'new',
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign assignments table
CREATE TABLE IF NOT EXISTS campaign_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, staff_id)
);

-- Lead status history
CREATE TABLE IF NOT EXISTS lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Campaigns policies
CREATE POLICY "Superadmins can manage campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Staff can read assigned campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_assignments ca
      JOIN profiles p ON p.id = auth.uid()
      WHERE ca.campaign_id = campaigns.id AND ca.staff_id = auth.uid()
    )
  );

-- Leads policies
CREATE POLICY "Superadmins can manage all leads"
  ON leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Staff can read assigned leads"
  ON leads FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Staff can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid());

-- Campaign assignments policies
CREATE POLICY "Superadmins can manage campaign assignments"
  ON campaign_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Staff can read own assignments"
  ON campaign_assignments FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

-- Lead status history policies
CREATE POLICY "Users can read related lead history"
  ON lead_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_status_history.lead_id
      AND (
        l.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'superadmin'
        )
      )
    )
  );

CREATE POLICY "Users can insert lead history"
  ON lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.email = 'admin@metahire.com' THEN 'superadmin'::user_role
      ELSE 'staff'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Insert demo users (these will be created when users sign up with these emails)
-- admin@metahire.com will automatically get superadmin role
-- staff@metahire.com will get staff role