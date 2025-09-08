/*
  # Create payments table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `amount` (numeric)
      - `currency` (text, default 'USD')
      - `payment_date` (date, nullable)
      - `due_date` (date, nullable)
      - `status` (enum: pending, paid, overdue, cancelled)
      - `payment_method` (text, nullable)
      - `notes` (text, nullable)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for authenticated users to manage payments
*/

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_date date,
  due_date date,
  status payment_status DEFAULT 'pending',
  payment_method text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow superadmin payment access"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can manage payments for their customers"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      JOIN leads ON customers.lead_id = leads.id
      WHERE customers.id = payments.customer_id 
      AND leads.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      JOIN leads ON customers.lead_id = leads.id
      WHERE customers.id = payments.customer_id 
      AND leads.assigned_to = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);