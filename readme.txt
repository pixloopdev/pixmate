PIXMATE CRM APPLICATION
========================

A comprehensive Customer Relationship Management (CRM) system built with React, TypeScript, and Supabase.

## OVERVIEW
This is a full-featured CRM application designed for managing leads, campaigns, staff, and customers. The system supports role-based access control with superadmin and staff user roles.

## KEY FEATURES

### 🔐 AUTHENTICATION & AUTHORIZATION
- User registration and login system
- Role-based access control (Superadmin & Staff)
- Protected routes based on user permissions
- Session management with automatic logout

### 👥 USER MANAGEMENT
- Superadmin can create and manage staff members
- Staff profile management
- User role assignment and permissions
- Staff activity tracking

### 📊 CAMPAIGN MANAGEMENT
- Create and manage marketing campaigns
- Assign campaigns to staff members
- Campaign status tracking
- Campaign-lead associations

### 🎯 LEAD MANAGEMENT
- Import leads from CSV files
- Lead status tracking with multiple stages:
  - New, Contacted, Interested, Not Interested
  - Potential, Not Attended, Busy/Call Back
  - Pay Later, Qualified, Proposal, Negotiation
  - Closed Won, Closed Lost
- Lead assignment to staff members
- Lead notes and activity history
- Bulk lead operations (delete, assign)
- Lead conversion to customers

### 👤 CUSTOMER MANAGEMENT
- Automatic customer creation from "Closed Won" leads
- Customer profile management
- Payment tracking and management
- Multi-currency support (USD, EUR, GBP, AED, SAR, INR, etc.)
- Payment status tracking (Pending, Paid, Overdue, Cancelled)

### 💰 PAYMENT SYSTEM
- Add and manage customer payments
- Multiple payment methods support
- Payment due date tracking
- Payment status management
- Currency-specific payment summaries
- Payment history and notes

### 📈 DASHBOARD & ANALYTICS
- Role-specific dashboards
- Key performance indicators (KPIs)
- Staff performance metrics
- Lead conversion tracking
- Payment summaries
- Recent activity feeds

## TECHNICAL STACK

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **React Router DOM** - Client-side routing
- **Vite** - Fast development server

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level security
- **Real-time subscriptions** - Live data updates

### Key Libraries
- @supabase/supabase-js - Supabase client
- React Router DOM - Navigation
- Lucide React - Icons

## DATABASE SCHEMA

### Core Tables
- **profiles** - User profiles with roles
- **campaigns** - Marketing campaigns
- **leads** - Lead information and status
- **customers** - Converted customers
- **payments** - Customer payments
- **campaign_assignments** - Staff-campaign relationships
- **lead_status_history** - Lead activity tracking

### Security Features
- Row Level Security (RLS) enabled
- Role-based data access policies
- Secure user authentication
- Data isolation between staff members

## USER ROLES & PERMISSIONS

### Superadmin
- Full system access
- Create and manage staff members
- Create and manage campaigns
- View all leads and customers
- Assign campaigns to staff
- Upload leads from CSV
- Manage all payments
- System-wide analytics

### Staff
- View assigned campaigns only
- Manage assigned leads
- Update lead status and notes
- View customers from their leads
- Manage payments for their customers
- Personal dashboard and metrics

## FEATURES IN DETAIL

### Lead Import System
- CSV file upload with validation
- Automatic lead parsing and creation
- Campaign assignment during import
- Bulk lead processing
- Error handling and progress tracking

### Status Management
- Comprehensive lead status workflow
- Automatic customer creation on "Closed Won"
- Status change history tracking
- Notes and comments system

### Payment Management
- Multi-currency payment support
- Payment method tracking
- Due date management
- Payment status workflow
- Customer payment summaries

### Dashboard Analytics
- Real-time statistics
- Role-specific metrics
- Activity feeds
- Quick action buttons
- Performance indicators

## SETUP REQUIREMENTS

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DEFAULT_CURRENCY=AED
```

### Database Setup
1. Create Supabase project
2. Run provided SQL migrations
3. Enable Row Level Security
4. Configure authentication policies

### Installation
```bash
npm install
npm run dev
```

## SECURITY FEATURES
- Row Level Security (RLS) policies
- Role-based access control
- Secure authentication flow
- Data isolation between users
- Protected API endpoints
- Input validation and sanitization

## RESPONSIVE DESIGN
- Mobile-first approach
- Responsive layouts for all screen sizes
- Touch-friendly interface
- Optimized for desktop and mobile use

## PERFORMANCE OPTIMIZATIONS
- Lazy loading of components
- Efficient database queries
- Optimized bundle size
- Fast development server (Vite)
- Minimal re-renders with React hooks

This CRM system provides a complete solution for managing customer relationships, from initial lead capture through to payment collection, with robust user management and security features.