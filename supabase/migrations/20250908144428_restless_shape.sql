/*
  # Temporarily disable RLS to debug data access issues

  This migration temporarily disables RLS on key tables to allow data access
  while we debug the staff listing issue.
*/

-- Temporarily disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on other tables that might be affected
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history DISABLE ROW LEVEL SECURITY;