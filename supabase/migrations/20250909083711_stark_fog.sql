/*
  # Fix staff customer access for converted leads

  1. Policy Updates
    - Update SELECT policy to properly allow staff to see customers from their assigned campaigns
    - Ensure staff can see customers they converted
    - Maintain superadmin access to all customers

  2. Security
    - Staff can only see customers they converted OR from leads assigned to them
    - Superadmins can see all customers
*/

-- Drop existing SELECT policy to recreate it properly
DROP POLICY IF EXISTS "Allow customer viewing" ON customers;

-- Create comprehensive SELECT policy for customers
CREATE POLICY "Staff and superadmin customer access"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    -- Superadmins can see all customers
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    ))
    OR
    -- Staff can see customers they converted
    (converted_by = auth.uid())
    OR
    -- Staff can see customers from leads that were assigned to them
    (EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = customers.lead_id 
      AND leads.assigned_to = auth.uid()
    ))
    OR
    -- Staff can see customers from campaigns assigned to them
    (EXISTS (
      SELECT 1 FROM leads
      JOIN campaign_assignments ON campaign_assignments.campaign_id = leads.campaign_id
      WHERE leads.id = customers.lead_id
      AND campaign_assignments.staff_id = auth.uid()
    ))
  );

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;