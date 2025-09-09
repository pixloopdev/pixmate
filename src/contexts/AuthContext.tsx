import React, { createContext, useContext, useEffect, useState } from 'react';
import { sqlite, Profile } from '../lib/sqlite';

interface User {
  id: string;
  email: string;
}

interface Session {
  user: User;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUser(user);
      setSession({ user });
      fetchProfile(user.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      if (!userId) {
        console.error('No user ID provided for profile fetch');
        setLoading(false);
        return;
      }

      const { data, error } = sqlite.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        console.error('Error fetching profile:', error.message, error.details);
        // If profile doesn't exist, this might be a new user
        if (error.code === 'PGRST116') {
          console.log('Profile not found, user might need to complete setup');
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user, profile, error } = await sqlite.auth.signIn(email, password);
      
      if (error) {
        return { error };
      }
      
      if (user && profile) {
        setUser(user);
        setProfile(profile);
        setSession({ user });
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Authentication failed' } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await sqlite.auth.signUp(email, password, fullName);
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'Registration failed' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};