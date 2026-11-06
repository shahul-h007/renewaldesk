import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _serviceRoleOverride: SupabaseClient | null = null;

/**
 * Allows test suites to inject an in-memory or mocked service role client.
 */
export function setServiceRoleSupabaseClientOverride(client: SupabaseClient | null) {
  _serviceRoleOverride = client;
}

/**
 * Returns a privileged Supabase client configured with the service role key.
 * Used exclusively by trusted backend server routes (billing verification, webhooks,
 * workspace deletion) to bypass RLS and perform secured state mutations.
 * 
 * NEVER import or invoke this function inside client components.
 */
export function getServiceRoleSupabaseClient(): SupabaseClient {
  if (_serviceRoleOverride) {
    return _serviceRoleOverride;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server configuration error: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for privileged operations.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
