import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(input?: string): string {
  if (!input) return '';
  let url = input.trim();
  // Strip leading db. if database host was copied instead of API host
  if (url.startsWith('db.')) {
    url = url.substring(3);
  } else if (url.includes('://db.')) {
    url = url.replace('://db.', '://');
  }
  // Ensure protocol is present
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const normalizedUrl = normalizeSupabaseUrl(rawUrl);

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  normalizedUrl &&
  normalizedUrl !== 'https://placeholder.supabase.co' &&
  rawKey &&
  rawKey !== 'placeholder-anon-key'
);

// Fallback to valid placeholder URL/key so createClient never throws during module load
const supabaseUrl = isSupabaseConfigured ? normalizedUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey! : 'placeholder-anon-key';

// Safe storage adapter supporting Web, SSR, and Native
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' && Platform.OS === 'web') return null;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && Platform.OS === 'web') return;
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && Platform.OS === 'web') return;
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Fetches the current session without automatically creating an anonymous user.
 */
export async function getExistingAuthSession() {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error fetching Supabase session:', error.message);
    }
    return session;
  } catch (err) {
    console.warn('Unexpected error checking auth session:', err);
    return null;
  }
}
