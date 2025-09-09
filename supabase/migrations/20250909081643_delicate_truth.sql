/*
  # Fix customers table INSERT policy

  1. Security Changes
    - Drop existing conflicting INSERT policies
    - Create a simple, working INSERT policy for authenticated users
    - Allow users to insert customers where they are the converter
    - Allow superadmins to insert any customer record

  This fixes the RLS policy violation when converting leads to customers.
*/

-- Drop any existing INSERT policies that might be conflicting
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers they convert" ON customers;
DROP POLICY IF EXISTS "Staff can insert customers for their leads" ON customers;

-- Create a simple INSERT policy that allows authenticated users to insert customers
-- where they are the converted_by user, or if they are superadmin
CREATE POLICY "Allow customer creation"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow superadmins to insert any customer
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    ))
    OR
    -- Allow staff to insert customers they converted
    (converted_by = auth.uid())
  );

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;