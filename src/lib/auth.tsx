import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Session, User, AuthResponse, UserResponse } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { queryClient } from './queryClient';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  isPermanentUser: boolean;
  isGuestActive: boolean;
  isUpgrading: boolean;
  setIsUpgrading: (upgrading: boolean) => void;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResponse | UserResponse>;
  signInAnonymously: () => Promise<AuthResponse | { data: { session: Session | null; user: User | null }; error: null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateDisplayName: (displayName: string) => Promise<UserResponse>;
  hasGuestData: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestActive, setIsGuestActive] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!isSupabaseConfigured) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession warning:', error.message);
        }
        if (isMounted) {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
        }
      } catch (err) {
        console.warn('Session restoration error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAnonymous = useMemo(() => {
    return Boolean(user && (user.is_anonymous || !user.email));
  }, [user]);

  const isPermanentUser = useMemo(() => {
    return Boolean(user && !user.is_anonymous && user.email);
  }, [user]);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    queryClient.clear();
    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (result.error) {
      throw result.error;
    }
    setIsGuestActive(false);
    queryClient.clear();
    return result;
  }, []);

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<AuthResponse | UserResponse> => {
      const cleanEmail = email.trim();
      const displayName = name.trim();

      if (user && isAnonymous) {
        // Upgrade guest session to permanent user account to keep all existing data
        const result = await supabase.auth.updateUser({
          email: cleanEmail,
          password,
          data: {
            display_name: displayName,
          },
        });
        if (result.error) {
          throw result.error;
        }
        setIsGuestActive(false);
        queryClient.clear();
        return result;
      } else {
        // Direct sign-up for new user
        const result = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });
        if (result.error) {
          throw result.error;
        }
        setIsGuestActive(false);
        queryClient.clear();
        return result;
      }
    },
    [user, isAnonymous]
  );

  const signInAnonymously = useCallback(async (): Promise<AuthResponse | { data: { session: Session | null; user: User | null }; error: null }> => {
    setIsGuestActive(true);
    if (session && user && isAnonymous) {
      // Existing anonymous session is active, reuse it to preserve guest data
      return { data: { session, user }, error: null };
    }
    queryClient.clear();
    const result = await supabase.auth.signInAnonymously();
    if (result.error) {
      setIsGuestActive(false);
      throw result.error;
    }
    queryClient.clear();
    return result;
  }, [session, user, isAnonymous]);

  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    setIsGuestActive(false);
    queryClient.clear();
    const result = await supabase.auth.signOut();
    queryClient.clear();
    return result;
  }, []);

  const updateDisplayName = useCallback(async (displayName: string): Promise<UserResponse> => {
    const result = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
      },
    });
    if (result.error) {
      throw result.error;
    }
    if (result.data.user) {
      setUser(result.data.user);
    }
    return result;
  }, []);

  const hasGuestData = useCallback(async (): Promise<boolean> => {
    if (!user || !isAnonymous) {
      return false;
    }
    try {
      // Check for any transactions created by guest
      const { count, error: txError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (!txError && count && count > 0) {
        return true;
      }

      // Check for custom wallets or modified balance
      const { data: wallets, error: wError } = await supabase
        .from('wallets')
        .select('*');

      if (!wError && wallets) {
        if (wallets.length > 1) return true;
        if (wallets.length === 1) {
          const w = wallets[0];
          if (w.name !== 'Cash' || Number(w.opening_balance) > 0) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }, [user, isAnonymous]);

  const value = useMemo(
    () => ({
      session,
      user,
      isAnonymous,
      isPermanentUser,
      isGuestActive,
      isUpgrading,
      setIsUpgrading,
      isLoading,
      signInWithPassword,
      signUp,
      signInAnonymously,
      signOut,
      updateDisplayName,
      hasGuestData,
    }),
    [session, user, isAnonymous, isPermanentUser, isGuestActive, isUpgrading, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return '';
  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (
    code === 'weak_password' ||
    message.includes('weak password') ||
    message.includes('at least 6') ||
    message.includes('at least 8')
  ) {
    return 'Password is too weak. Please use at least 8 characters.';
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'Too many email requests. Please wait a few minutes before trying again.';
  }
  if (
    code === 'email_address_invalid' ||
    message.includes('invalid email') ||
    message.includes('address is invalid')
  ) {
    return 'Please enter a valid email address.';
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch')
  ) {
    return 'Network connection error. Please check your internet connection.';
  }
  return error.message || 'An unexpected authentication error occurred.';
}
