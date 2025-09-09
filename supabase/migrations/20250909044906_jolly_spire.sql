/*
  # Fix customers table RLS INSERT policy

  1. Security Changes
    - Drop all existing INSERT policies to avoid conflicts
    - Create a simple, direct INSERT policy for authenticated users
    - Allow superadmins full access
    - Allow staff to insert customers where they are the converter

  2. Policy Logic
    - Superadmins can insert any customer record
    - Staff can only insert customers where converted_by = auth.uid()
    - Simple and direct approach following Supabase best practices
*/

-- Drop existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Allow customer creation with proper validation" ON customers;
DROP POLICY IF EXISTS "Staff can insert customers from assigned leads" ON customers;

-- Create a simple INSERT policy for customers
CREATE POLICY "Allow authenticated users to insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmins can insert any customer
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    ))
    OR
    -- Staff can insert customers where they are the converter
    (converted_by = auth.uid())
  );