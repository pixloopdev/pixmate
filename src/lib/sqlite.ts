import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'metahire.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
const initializeDatabase = () => {
  const schema = `
    -- Users table for authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'superadmin')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Campaigns table
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES profiles(id)
    );

    -- Campaign assignments table
    CREATE TABLE IF NOT EXISTS campaign_assignments (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      staff_id TEXT,
      assigned_by TEXT,
      assigned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES profiles(id),
      UNIQUE(campaign_id, staff_id)
    );

    -- Leads table
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'potential', 'not_attended', 'busy_call_back', 'pay_later', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
      notes TEXT,
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES profiles(id)
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      notes TEXT,
      converted_at TEXT DEFAULT (datetime('now')),
      converted_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
      FOREIGN KEY (converted_by) REFERENCES profiles(id)
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'AED',
      payment_date TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
      payment_method TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES profiles(id)
    );

    -- Lead status history table
    CREATE TABLE IF NOT EXISTS lead_status_history (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT,
      changed_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES profiles(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
    CREATE INDEX IF NOT EXISTS idx_campaign_assignments_staff_id ON campaign_assignments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_assignments_campaign_id ON campaign_assignments(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_customers_converted_by ON customers(converted_by);
    CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
  `;

  // Execute schema
  db.exec(schema);

  // Insert sample data if not exists
  const sampleData = `
    INSERT OR IGNORE INTO users (id, email, password_hash) VALUES 
      ('admin-001', 'admin@metahire.com', 'admin123'),
      ('staff-001', 'staff@metahire.com', 'staff123');

    INSERT OR IGNORE INTO profiles (id, email, full_name, role) VALUES 
      ('admin-001', 'admin@metahire.com', 'Admin User', 'superadmin'),
      ('staff-001', 'staff@metahire.com', 'Staff User', 'staff');

    INSERT OR IGNORE INTO campaigns (id, name, description, created_by) VALUES 
      ('campaign-001', 'Test Campaign', 'Test campaign for development', 'admin-001');

    INSERT OR IGNORE INTO campaign_assignments (id, campaign_id, staff_id, assigned_by) VALUES 
      ('assignment-001', 'campaign-001', 'staff-001', 'admin-001');
  `;

  db.exec(sampleData);
};

// Initialize database on startup
initializeDatabase();

// Generate unique ID
const generateId = (prefix: string = '') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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

// SQLite client with Supabase-like API
export const sqlite = {
  // User authentication
  auth: {
    signIn: async (email: string, password: string) => {
      try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?');
        const user = stmt.get(email, password) as any;
        
        if (user) {
          const profileStmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
          const profile = profileStmt.get(user.id) as Profile;
          return { user, profile, error: null };
        }
        return { user: null, profile: null, error: { message: 'Invalid credentials' } };
      } catch (error: any) {
        return { user: null, profile: null, error: { message: error.message } };
      }
    },
    
    signUp: async (email: string, password: string, fullName: string) => {
      try {
        const userId = generateId('user-');
        
        const userStmt = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
        userStmt.run(userId, email, password);
        
        const profileStmt = db.prepare('INSERT INTO profiles (id, email, full_name, role) VALUES (?, ?, ?, ?)');
        profileStmt.run(userId, email, fullName, 'staff');
        
        return { error: null };
      } catch (error: any) {
        return { error: { message: 'User already exists or registration failed' } };
      }
    }
  },

  // Database queries with Supabase-like API
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: (column: string, value: any) => ({
        single: () => {
          try {
            const stmt = db.prepare(`SELECT ${columns} FROM ${table} WHERE ${column} = ? LIMIT 1`);
            const result = stmt.get(value);
            return { data: result || null, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        }
      }),
      
      order: (column: string, options: { ascending: boolean }) => {
        const direction = options.ascending ? 'ASC' : 'DESC';
        try {
          const stmt = db.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${column} ${direction}`);
          const results = stmt.all();
          return { data: results, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      }
    }),
    
    insert: (values: any[]) => {
      try {
        const keys = Object.keys(values[0]);
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
        
        const insertMany = db.transaction((items: any[]) => {
          for (const item of items) {
            const params = keys.map(key => item[key]);
            stmt.run(...params);
          }
        });
        
        insertMany(values);
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    
    update: (values: any) => ({
      eq: (column: string, value: any) => {
        try {
          const keys = Object.keys(values);
          const setClause = keys.map(key => `${key} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE ${column} = ?`);
          const params = [...keys.map(key => values[key]), value];
          stmt.run(...params);
          return { error: null };
        } catch (error: any) {
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
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    })
  })
};

export default sqlite;