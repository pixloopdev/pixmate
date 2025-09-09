/*
  # Fix customers table RLS INSERT policy

  1. Security Updates
    - Drop existing conflicting INSERT policy
    - Create proper INSERT policy for staff to convert leads to customers
    - Ensure superadmins can insert any customer record
    - Validate that staff can only convert their own assigned leads

  2. Policy Details
    - Staff can insert customers if they converted the lead (converted_by = auth.uid())
    - Staff can only convert leads that are assigned to them
    - Superadmins have full access to insert any customer record
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Staff can create customers from their leads" ON customers;

-- Create a comprehensive INSERT policy for customers
CREATE POLICY "Allow customer creation with proper validation"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmins can insert any customer record
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    ))
    OR
    -- Staff can insert customers if:
    -- 1. They are the one converting (converted_by = auth.uid())
    -- 2. The lead being converted is assigned to them
    (
      converted_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM leads 
        WHERE leads.id = customers.lead_id 
        AND leads.assigned_to = auth.uid()
      )
    )
  );