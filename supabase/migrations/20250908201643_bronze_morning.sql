/*
  # Fix payments table - ensure all columns exist

  1. Table Updates
    - Add missing columns if they don't exist
    - Ensure proper data types and constraints
    - Add default values where appropriate

  2. Security
    - Maintain existing RLS policies
*/

-- Add missing columns to payments table if they don't exist
DO $$
BEGIN
  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE payments ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add payment_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_date timestamptz;
  END IF;

  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE payments ADD COLUMN due_date timestamptz;
  END IF;

  -- Add payment_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_method text;
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE payments ADD COLUMN notes text;
  END IF;
END $$;