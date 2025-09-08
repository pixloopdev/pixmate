import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'superadmin' | 'staff' | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'potential' | 'not_attended' | 'busy_call_back' | 'pay_later' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignAssignment {
  id: string;
  campaign_id: string;
  staff_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface Customer {
  id: string;
  lead_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  notes: string | null;
  converted_at: string;
  converted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string | null;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}