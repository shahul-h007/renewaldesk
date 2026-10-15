import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test override for isolated testing
let _supabaseOverride: SupabaseClient | null = null;

export function setWebhookSupabaseClientOverride(client: any) {
  _supabaseOverride = client;
}

// Helper to get service/admin client for background webhook tasks
// Throws explicitly if SUPABASE_SERVICE_ROLE_KEY is missing to prevent silent RLS failures
export function getWebhookSupabaseClient(): SupabaseClient {
  if (_supabaseOverride) {
    return _supabaseOverride;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for webhook processing.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
