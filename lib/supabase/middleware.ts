import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from './config';

/**
 * Validates that a redirect path is internal and safe, preventing open redirect attacks.
 */
function isSafeInternalPath(path: string | null): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://');
}

/**
 * Refreshes auth sessions and protects operational routes.
 * Ensures unauthenticated visitors cannot access protected business workspaces.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Protected operational routes requiring authentication
  const isProtectedPath = [
    '/dashboard',
    '/customers',
    '/services',
    '/results',
    '/templates',
    '/import',
    '/settings',
    '/onboarding',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // Auth pages (login, signup, forgot-password)
  const isAuthPath = ['/login', '/signup', '/forgot-password'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // If Supabase is not configured, fail-closed for protected operational paths
  if (!isSupabaseConfigured()) {
    if (isProtectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('setup', 'required');
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated user trying to access protected paths
  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated user trying to access login/signup pages
  if (user && isAuthPath) {
    const rawRedirect = request.nextUrl.searchParams.get('redirectTo');
    const safeTarget = isSafeInternalPath(rawRedirect) ? rawRedirect! : '/dashboard';
    const redirectUrl = new URL(safeTarget, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
