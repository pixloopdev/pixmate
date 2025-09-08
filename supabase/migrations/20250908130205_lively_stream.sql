/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Existing RLS policies on profiles table are causing infinite recursion
    - Policies are likely referencing the profiles table within their own conditions

  2. Solution
    - Drop all existing policies on profiles table
    - Create simple, non-recursive policies
    - Use only auth.uid() comparisons to avoid table lookups

  3. Security
    - Users can only read/update their own profile
    - Profile creation allowed during signup
    - No complex role-based policies that cause recursion
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Staff can read assigned campaigns" ON profiles;
DROP POLICY IF EXISTS "Superadmins can manage all leads" ON profiles;
DROP POLICY IF EXISTS "Superadmins can manage campaigns" ON profiles;

-- Disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "profiles_select_own" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
  ON profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);