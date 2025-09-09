// SQLite Database Configuration using sql.js (browser-compatible)
import initSqlJs from 'sql.js';

let SQL: any = null;
let db: any = null;

// Initialize SQL.js
const initDB = async () => {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
  }
  
  if (!db) {
    // Try to load existing database from localStorage
    const savedDB = localStorage.getItem('metahire_db');
    if (savedDB) {
      const uint8Array = new Uint8Array(JSON.parse(savedDB));
      db = new SQL.Database(uint8Array);
    } else {
      // Create new database
      db = new SQL.Database();
      await createTables();
    }
  }
  
  return db;
};

// Save database to localStorage
const saveDB = () => {
  if (db) {
    const data = db.export();
    const buffer = JSON.stringify(Array.from(data));
    localStorage.setItem('metahire_db', buffer);
  }
};

// Create tables
const createTables = async () => {
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

    -- Insert sample data
    INSERT OR IGNORE INTO users (id, email, password_hash) VALUES 
      ('admin-001', 'admin@metahire.com', 'admin123'),
      ('staff-001', 'staff@metahire.com', 'staff123');

    INSERT OR IGNORE INTO profiles (id, email, full_name, role) VALUES 
      ('admin-001', 'admin@metahire.com', 'Admin User', 'superadmin'),
      ('staff-001', 'staff@metahire.com', 'Staff User', 'staff');

    INSERT OR IGNORE INTO campaigns (id, name, description, created_by) VALUES 
      ('campaign-001', 'test', 'Test campaign for development', 'admin-001');

    INSERT OR IGNORE INTO campaign_assignments (id, campaign_id, staff_id, assigned_by) VALUES 
      ('assignment-001', 'campaign-001', 'staff-001', 'admin-001');
  `;

  db.exec(schema);
  saveDB();
};

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

// Helper functions for database operations
export const sqlite = {
  // Initialize database
  init: initDB,

  // User authentication
  auth: {
    signIn: async (email: string, password: string) => {
      try {
        await initDB();
        const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?');
        const user = stmt.getAsObject([email, password]);
        
        if (user && Object.keys(user).length > 0) {
          const profileStmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
          const profile = profileStmt.getAsObject([user.id]);
          return { user, profile, error: null };
        }
        return { user: null, profile: null, error: { message: 'Invalid credentials' } };
      } catch (error: any) {
        return { user: null, profile: null, error: { message: error.message } };
      }
    },
    
    signUp: async (email: string, password: string, fullName: string) => {
      try {
        await initDB();
        const userId = generateId('user-');
        
        const userStmt = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
        userStmt.run([userId, email, password]);
        
        const profileStmt = db.prepare('INSERT INTO profiles (id, email, full_name, role) VALUES (?, ?, ?, ?)');
        profileStmt.run([userId, email, fullName, 'staff']);
        
        saveDB();
        return { error: null };
      } catch (error: any) {
        return { error: { message: 'User already exists or registration failed' } };
      }
    },
    
    signOut: async () => {
      return { error: null };
    }
  },

  // Database queries
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: async (column: string, value: any) => {
        try {
          await initDB();
          const stmt = db.prepare(`SELECT ${columns} FROM ${table} WHERE ${column} = ?`);
          const results = [];
          stmt.bind([value]);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return { data: results, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },
      
      single: async () => {
        try {
          await initDB();
          const stmt = db.prepare(`SELECT ${columns} FROM ${table} LIMIT 1`);
          const result = stmt.getAsObject();
          stmt.free();
          return { data: Object.keys(result).length > 0 ? result : null, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },
      
      order: (column: string, options: { ascending: boolean }) => ({
        all: async () => {
          try {
            await initDB();
            const direction = options.ascending ? 'ASC' : 'DESC';
            const stmt = db.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${column} ${direction}`);
            const results = [];
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            stmt.free();
            return { data: results, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        }
      }),

      all: async () => {
        try {
          await initDB();
          const stmt = db.prepare(`SELECT ${columns} FROM ${table}`);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return { data: results, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      }
    }),
    
    insert: async (values: any[]) => {
      try {
        await initDB();
        const keys = Object.keys(values[0]);
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
        
        for (const value of values) {
          const params = keys.map(key => value[key]);
          stmt.run(params);
        }
        
        stmt.free();
        saveDB();
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    
    update: (values: any) => ({
      eq: async (column: string, value: any) => {
        try {
          await initDB();
          const keys = Object.keys(values);
          const setClause = keys.map(key => `${key} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE ${column} = ?`);
          const params = [...keys.map(key => values[key]), value];
          stmt.run(params);
          stmt.free();
          saveDB();
          return { error: null };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    
    delete: () => ({
      eq: async (column: string, value: any) => {
        try {
          await initDB();
          const stmt = db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`);
          stmt.run([value]);
          stmt.free();
          saveDB();
          return { error: null };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    })
  })
};

export default sqlite;