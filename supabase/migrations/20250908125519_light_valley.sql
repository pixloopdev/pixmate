/*
  # Fix user creation database error

  1. New Tables
    - Ensure proper user profile creation with trigger function
    - Fix any foreign key constraints
    - Add proper RLS policies

  2. Security
    - Enable RLS on all tables
    - Add policies for user creation and management

  3. Triggers
    - Add trigger to automatically create profile when user signs up
*/

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create lead_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role user_role DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
CREATE POLICY "Superadmins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert profiles" ON profiles;
CREATE POLICY "Superadmins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
DROP POLICY IF EXISTS "Superadmins can manage campaigns" ON campaigns;
CREATE POLICY "Superadmins can manage campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Staff can read assigned campaigns" ON campaigns;
CREATE POLICY "Staff can read assigned campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_assignments ca
      JOIN profiles p ON p.id = auth.uid()
      WHERE ca.campaign_id = campaigns.id
      AND ca.staff_id = auth.uid()
    )
  );

-- Create leads table
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

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
DROP POLICY IF EXISTS "Superadmins can manage all leads" ON leads;
CREATE POLICY "Superadmins can manage all leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Staff can read assigned leads" ON leads;
CREATE POLICY "Staff can read assigned leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Staff can update assigned leads" ON leads;
CREATE POLICY "Staff can update assigned leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid());

-- Create campaign_assignments table
CREATE TABLE IF NOT EXISTS campaign_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, staff_id)
);

ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign_assignments
DROP POLICY IF EXISTS "Superadmins can manage campaign assignments" ON campaign_assignments;
CREATE POLICY "Superadmins can manage campaign assignments"
  ON campaign_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Staff can read own assignments" ON campaign_assignments;
CREATE POLICY "Staff can read own assignments"
  ON campaign_assignments
  FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

-- Create lead_status_history table
CREATE TABLE IF NOT EXISTS lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_status_history
DROP POLICY IF EXISTS "Users can insert lead history" ON lead_status_history;
CREATE POLICY "Users can insert lead history"
  ON lead_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Users can read related lead history" ON lead_status_history;
CREATE POLICY "Users can read related lead history"
  ON lead_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_status_history.lead_id
      AND (
        l.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'superadmin'
        )
      )
    )
  );

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Allow public to insert into profiles during user creation
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);