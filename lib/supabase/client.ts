import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from './config';

/**
 * Returns a Supabase client configured for browser execution.
 * Handles automatic token refreshes and cookie synchronization.
 */
export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}
