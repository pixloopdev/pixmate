/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - Current policies create infinite recursion when checking user roles
    - Policies reference the profiles table while being applied to the profiles table

  2. Solution
    - Simplify policies to avoid circular references
    - Use direct auth.uid() comparisons instead of subqueries to profiles table
    - Create separate policies for different operations

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies that don't cause recursion
    - Maintain security while avoiding circular references
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Superadmins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new simplified policies without recursion

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow profile creation during signup (simplified)
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- For superadmin access, we'll handle this in the application layer
-- instead of using recursive policies that check the profiles table