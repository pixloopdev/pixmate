/*
  # Completely reset profiles RLS to fix infinite recursion

  1. Security Changes
    - Temporarily disable RLS on profiles table
    - Drop ALL existing policies that might cause recursion
    - Re-enable RLS with only the most basic policy
    - Use the simplest possible auth check to avoid any circular dependencies

  This migration completely resets the profiles table RLS to eliminate any possibility of infinite recursion.
*/

-- Disable RLS temporarily to clear all policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow superadmin profile access" ON profiles;
DROP POLICY IF EXISTS "Basic profile access" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create the most basic policy possible - users can only access their own profile
CREATE POLICY "users_own_profile_only" ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);