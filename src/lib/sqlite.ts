// SQLite Database Configuration and Helper Functions
// This replaces the Supabase client for local SQLite usage

import Database from 'better-sqlite3';

// Database connection
const db = new Database('./metahire.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Types (same as before but for SQLite)
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
  currency: string;
  payment_date: string | null;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper functions for database operations
export const sqlite = {
  // User authentication (simplified)
  auth: {
    signIn: async (email: string, password: string) => {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        // In a real app, you'd verify the password hash here
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(user.id);
        return { user, profile, error: null };
      }
      return { user: null, profile: null, error: { message: 'Invalid credentials' } };
    },
    
    signUp: async (email: string, password: string, fullName: string) => {
      try {
        const userId = `user-${Date.now()}`;
        // In a real app, you'd hash the password here
        db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email, password);
        db.prepare('INSERT INTO profiles (id, email, full_name, role) VALUES (?, ?, ?, ?)').run(userId, email, fullName, 'staff');
        return { error: null };
      } catch (error) {
        return { error: { message: 'User already exists' } };
      }
    },
    
    signOut: async () => {
      // Clear session storage or cookies
      return { error: null };
    }
  },

  // Database queries
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: (column: string, value: any) => {
        const stmt = db.prepare(`SELECT ${columns} FROM ${table} WHERE ${column} = ?`);
        const data = stmt.all(value);
        return { data, error: null };
      },
      
      single: () => {
        const stmt = db.prepare(`SELECT ${columns} FROM ${table} LIMIT 1`);
        const data = stmt.get();
        return { data, error: null };
      },
      
      order: (column: string, options: { ascending: boolean }) => ({
        all: () => {
          const direction = options.ascending ? 'ASC' : 'DESC';
          const stmt = db.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${column} ${direction}`);
          const data = stmt.all();
          return { data, error: null };
        }
      })
    }),
    
    insert: (values: any[]) => {
      try {
        const keys = Object.keys(values[0]);
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
        
        for (const value of values) {
          stmt.run(...keys.map(key => value[key]));
        }
        
        return { error: null };
      } catch (error) {
        return { error: { message: error.message } };
      }
    },
    
    update: (values: any) => ({
      eq: (column: string, value: any) => {
        try {
          const keys = Object.keys(values);
          const setClause = keys.map(key => `${key} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${column} = ?`);
          stmt.run(...keys.map(key => values[key]), value);
          return { error: null };
        } catch (error) {
          return { error: { message: error.message } };
        }
      }
    }),
    
    delete: () => ({
      eq: (column: string, value: any) => {
        try {
          const stmt = db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`);
          stmt.run(value);
          return { error: null };
        } catch (error) {
          return { error: { message: error.message } };
        }
      }
    })
  })
};

export default sqlite;