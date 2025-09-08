/*
  # Fix staff access policies

  1. Security Updates
    - Allow superadmins to read all profiles
    - Ensure staff members can be listed by superadmins
    - Fix any remaining RLS policy issues

  2. Changes
    - Add policy for superadmins to read all profiles
    - Ensure proper role-based access
*/

-- First, let's add a policy that allows superadmins to read all profiles
-- We'll use a function to avoid recursion issues
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for superadmins to read all profiles
CREATE POLICY "Superadmins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_superadmin() OR auth.uid() = id);

-- Also ensure superadmins can read staff data for other tables
DROP POLICY IF EXISTS "Allow superadmin lead access" ON leads;
CREATE POLICY "Allow superadmin lead access"
  ON leads
  FOR ALL
  TO authenticated
  USING (is_superadmin());

DROP POLICY IF EXISTS "Allow superadmin campaign access" ON campaigns;
CREATE POLICY "Allow superadmin campaign access"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (is_superadmin());

DROP POLICY IF EXISTS "Allow superadmin assignment access" ON campaign_assignments;
CREATE POLICY "Allow superadmin assignment access"
  ON campaign_assignments
  FOR ALL
  TO authenticated
  USING (is_superadmin());