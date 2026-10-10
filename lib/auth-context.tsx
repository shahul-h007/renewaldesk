'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import { isSupabaseConfigured } from './supabase/config';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export interface BusinessContext {
  id: string;
  name: string;
  businessType: string;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
  role: 'owner' | 'manager' | 'staff';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessContext | null;
  businesses: BusinessContext[];
  isLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchBusiness: (businessId: string) => void;
  refreshBusinessContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessContext | null>(null);
  const [businesses, setBusinesses] = useState<BusinessContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const fetchUserAndBusiness = useCallback(async (currentUser: User | null) => {
    if (!configured || !currentUser) {
      setUser(null);
      setProfile(null);
      setBusiness(null);
      setBusinesses([]);
      setAuthError(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Fetch profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profData) {
        setProfile({
          id: profData.id,
          fullName: profData.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          email: profData.email || currentUser.email || '',
          avatarUrl: profData.avatar_url || currentUser.user_metadata?.avatar_url,
        });
      } else {
        setProfile({
          id: currentUser.id,
          fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
        });
      }

      // Fetch user's business memberships and businesses
      const { data: memberRows, error: memberErr } = await supabase
        .from('business_members')
        .select(`
          role,
          business:businesses (
            id,
            name,
            business_type,
            phone,
            address,
            timezone,
            currency
          )
        `)
        .eq('user_id', currentUser.id);

      if (memberErr) {
        console.error('Error fetching user business memberships:', memberErr);
        setAuthError(memberErr.message || 'Failed to query business memberships from cloud database');
        setBusinesses([]);
        setBusiness(null);
      } else if (memberRows && memberRows.length > 0) {
        const parsedList: BusinessContext[] = memberRows
          .filter((m: any) => m.business)
          .map((m: any) => ({
            id: m.business.id,
            name: m.business.name,
            businessType: m.business.business_type,
            phone: m.business.phone || '',
            address: m.business.address || '',
            timezone: m.business.timezone || 'Asia/Kolkata',
            currency: m.business.currency || '₹',
            role: m.role as 'owner' | 'manager' | 'staff',
          }));

        setBusinesses(parsedList);

        // Keep active business selection from storage or default to first
        const savedBizId = typeof window !== 'undefined' ? localStorage.getItem('rd_active_biz_id') : null;
        const matchingBiz = parsedList.find(b => b.id === savedBizId) || parsedList[0];
        setBusiness(matchingBiz || null);
        if (matchingBiz && typeof window !== 'undefined') {
          localStorage.setItem('rd_active_biz_id', matchingBiz.id);
        }
        setAuthError(null);
      } else {
        setBusinesses([]);
        setBusiness(null);
        setAuthError(null);
      }
    } catch (err: any) {
      console.error('Error fetching user context:', err);
      setAuthError(err.message || 'Unexpected error fetching user context');
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      fetchUserAndBusiness(activeUser);
    });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      fetchUserAndBusiness(activeUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured, fetchUserAndBusiness]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    if (!configured) {
      return { error: new Error('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
    }
    const supabase = createClient();
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (configured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setBusiness(null);
    setBusinesses([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rd_active_biz_id');
      window.location.href = '/login';
    }
  };

  const switchBusiness = (businessId: string) => {
    const selected = businesses.find(b => b.id === businessId);
    if (selected) {
      setBusiness(selected);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rd_active_biz_id', selected.id);
      }
    }
  };

  const refreshBusinessContext = async () => {
    if (user) {
      await fetchUserAndBusiness(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        businesses,
        isLoading,
        isConfigured: configured,
        authError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        switchBusiness,
        refreshBusinessContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
