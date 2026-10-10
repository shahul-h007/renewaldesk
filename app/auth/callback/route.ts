import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const rawNext = requestUrl.searchParams.get('next');
  const safeNext = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://'))
    ? rawNext
    : '/dashboard';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has an associated business
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}
