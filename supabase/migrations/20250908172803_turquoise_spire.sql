/*
  # Add new lead status enum values

  1. Enum Updates
    - Add 'interested' to lead_status enum
    - Add 'not_interested' to lead_status enum  
    - Add 'potential' to lead_status enum
    - Add 'not_attended' to lead_status enum
    - Add 'busy_call_back' to lead_status enum
    - Add 'pay_later' to lead_status enum

  2. Notes
    - These values match the frontend status options
    - Existing data will not be affected
    - New status values can be used immediately after migration
*/

-- Add new enum values to lead_status type
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'not_interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'potential';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'not_attended';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'busy_call_back';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pay_later';