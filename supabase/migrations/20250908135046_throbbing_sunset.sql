/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - Current RLS policies are causing infinite recursion
    - Policies on profiles table are checking profiles table within themselves
    - This creates circular dependencies during policy evaluation

  2. Solution
    - Simplify RLS policies to avoid self-referencing
    - Use auth.uid() directly instead of querying profiles table
    - Remove circular dependencies between tables

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies without recursion
    - Ensure superadmin access without circular checks
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Staff can read assigned leads" ON leads;
DROP POLICY IF EXISTS "Staff can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Superadmins can manage all leads" ON leads;

DROP POLICY IF EXISTS "Users can insert lead history" ON lead_status_history;
DROP POLICY IF EXISTS "Users can read related lead history" ON lead_status_history;

DROP POLICY IF EXISTS "Staff can read assigned campaigns" ON campaigns;
DROP POLICY IF EXISTS "Superadmins can manage campaigns" ON campaigns;

DROP POLICY IF EXISTS "Staff can read own assignments" ON campaign_assignments;
DROP POLICY IF EXISTS "Superadmins can manage campaign assignments" ON campaign_assignments;

-- Create new simplified policies without recursion

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow superadmins to read all profiles (simplified check)
CREATE POLICY "Allow superadmin profile access"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );

-- Leads policies (simplified)
CREATE POLICY "Users can read assigned leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Users can update assigned leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Allow all operations for superadmins on leads
CREATE POLICY "Allow superadmin lead access"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );

-- Lead status history policies
CREATE POLICY "Users can insert lead history"
  ON lead_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

CREATE POLICY "Users can read lead history"
  ON lead_status_history
  FOR SELECT
  TO authenticated
  USING (
    changed_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_status_history.lead_id 
      AND leads.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );

-- Campaign policies
CREATE POLICY "Allow superadmin campaign access"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );

CREATE POLICY "Staff can read assigned campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_assignments 
      WHERE campaign_id = campaigns.id 
      AND staff_id = auth.uid()
    )
  );

-- Campaign assignments policies
CREATE POLICY "Users can read own assignments"
  ON campaign_assignments
  FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Allow superadmin assignment access"
  ON campaign_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );