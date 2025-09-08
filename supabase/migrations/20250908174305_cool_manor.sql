/*
  # Create customers and payments tables

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `company` (text)
      - `position` (text)
      - `notes` (text)
      - `converted_at` (timestamp)
      - `converted_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `payments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `amount` (decimal)
      - `payment_date` (date)
      - `due_date` (date)
      - `status` (enum: pending, paid, overdue, cancelled)
      - `payment_method` (text)
      - `notes` (text)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
</sql>

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  notes text,
  converted_at timestamptz DEFAULT now(),
  converted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
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
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Allow superadmin customer access"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Staff can read customers from their leads"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = customers.lead_id 
      AND leads.assigned_to = auth.uid()
    )
  );

-- Create policies for payments
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

CREATE POLICY "Staff can read payments for their customers"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      JOIN leads ON leads.id = customers.lead_id
      WHERE customers.id = payments.customer_id 
      AND leads.assigned_to = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_converted_at ON customers(converted_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);