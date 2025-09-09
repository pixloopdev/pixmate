/*
  # Fix customers table INSERT policy

  1. Security Changes
    - Add INSERT policy for customers table to allow staff to create customer records
    - Allow authenticated users to insert customers where they are the converter
    - Allow superadmins to insert any customer record

  This fixes the RLS policy violation when converting leads to customers.
*/

-- Add INSERT policy for customers table
CREATE POLICY "Staff can create customers from their leads"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the user is a superadmin
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    ))
    OR
    -- Allow if the user is converting their own lead
    (converted_by = auth.uid() AND EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = customers.lead_id 
      AND leads.assigned_to = auth.uid()
    ))
  );