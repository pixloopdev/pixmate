/*
  # Fix customers RLS policy for proper customer creation

  1. Security Changes
    - Drop all existing conflicting policies
    - Create a simple, working INSERT policy for customers
    - Ensure superadmins and staff can create customer records properly

  2. Policy Logic
    - Superadmins can insert any customer record
    - Staff can insert customers where they are the converter
    - Simple OR condition for clear policy evaluation
*/

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Allow customer creation" ON customers;
DROP POLICY IF EXISTS "Users can insert customers they convert" ON customers;
DROP POLICY IF EXISTS "Superadmin and staff customer creation" ON customers;
DROP POLICY IF EXISTS "Allow superadmin customer access" ON customers;
DROP POLICY IF EXISTS "Staff can insert customers for their leads" ON customers;

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create a simple, working INSERT policy
CREATE POLICY "Enable customer creation for authenticated users"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is superadmin
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'superadmin'
      )
    )
    OR
    -- Allow if user is the one converting the lead
    (converted_by = auth.uid())
  );

-- Also ensure SELECT policy exists for viewing customers
DROP POLICY IF EXISTS "Staff can read customers from their leads" ON customers;
CREATE POLICY "Users can read customers they have access to"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    -- Superadmins can see all customers
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'superadmin'
      )
    )
    OR
    -- Staff can see customers they converted
    (converted_by = auth.uid())
    OR
    -- Staff can see customers from leads they were assigned to
    (
      EXISTS (
        SELECT 1 FROM leads 
        WHERE leads.id = customers.lead_id 
        AND leads.assigned_to = auth.uid()
      )
    )
  );