/**
 * Supabase configuration and environment verification helper.
 * Provides safe checks so the application never crashes if environment variables are not yet configured.
 */

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    url.trim().length > 0 &&
    anonKey.trim().length > 0 &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-key')
  );
};

export const getSupabaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
};

export const getSupabaseAnonKey = (): string => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
};
