/*
  # Reset profiles RLS policies to fix infinite recursion

  1. Security Changes
    - Drop all existing policies on profiles table that cause recursion
    - Create simple, non-recursive policies
    - Use direct auth.uid() checks without subqueries
    - Avoid any self-referencing policy logic

  2. New Policies
    - Users can read their own profile (simple auth.uid() = id check)
    - Users can update their own profile
    - Users can insert their own profile during registration
    - No complex role-based policies that cause recursion
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Allow superadmin profile access" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Superadmin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can read own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can update own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can insert own profile" ON profiles;

-- Create simple, non-recursive policies
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

-- For now, we'll handle superadmin access through application logic
-- rather than RLS policies to avoid recursion issues