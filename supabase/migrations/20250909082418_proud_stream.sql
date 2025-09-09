/*
  # Fix customers table RLS policy for superadmin access

  1. Security Updates
    - Drop existing conflicting INSERT policies
    - Create proper policy that allows superadmin role to insert customers
    - Ensure staff can only insert customers they convert
  
  2. Policy Logic
    - Superadmins: Can insert any customer record
    - Staff: Can only insert where converted_by = auth.uid()
*/

-- Drop existing INSERT policies that might be conflicting
DROP POLICY IF EXISTS "Allow customer creation" ON customers;
DROP POLICY IF EXISTS "Users can insert customers they convert" ON customers;
DROP POLICY IF EXISTS "Allow superadmin customer access" ON customers;

-- Create a comprehensive INSERT policy that properly handles superadmin role
CREATE POLICY "Superadmin and staff customer creation"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow superadmins to insert any customer
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    -- Allow staff to insert customers they are converting
    converted_by = auth.uid()
  );

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;