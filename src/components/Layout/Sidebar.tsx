import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  UserPlus,
  Settings, 
  LogOut,
  Building2,
  UserCheck
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const superAdminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/staff', icon: Users, label: 'Staff Management' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/leads', icon: UserPlus, label: 'Leads' },
    { to: '/customers', icon: UserCheck, label: 'Customers' },
  ];

  const staffLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: UserPlus, label: 'My Leads' },
    { to: '/campaigns', icon: Megaphone, label: 'My Campaigns' },
    { to: '/customers', icon: UserCheck, label: 'My Customers' },
  ];

  const links = profile?.role === 'superadmin' ? superAdminLinks : staffLinks;

  return (
    <div className="bg-slate-900 text-white w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">Pixmate CRM</h1>
            <p className="text-sm text-slate-400">CRM System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-4">
          <p className="text-sm text-slate-400">Logged in as</p>
          <p className="font-medium">{profile?.full_name || profile?.email}</p>
          <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
        </div>
        
        <div className="space-y-2">
          <NavLink
            to="/settings"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </NavLink>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;