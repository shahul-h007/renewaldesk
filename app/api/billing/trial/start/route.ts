import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FREE_TRIAL_DURATION_DAYS, FREE_TRIAL_MAX_CUSTOMERS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to activate the trial.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId parameter.' }, { status: 400 });
    }

    // 1. Verify user is strictly the OWNER of this workspace
    const { data: membership, error: memberErr } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !membership) {
      return NextResponse.json(
        { error: 'You are not an authorized member of this workspace.' },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the workspace owner can activate the 14-day free trial.' },
        { status: 403 }
      );
    }

    // 2. Attempt atomic database RPC function first
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('start_free_trial', {
        p_business_id: businessId,
      });

      if (!rpcErr) {
        return NextResponse.json({
          success: true,
          businessId,
          trialStatus: 'active',
          trialStartedAt: rpcData?.trial_started_at || new Date().toISOString(),
          trialExpiresAt: rpcData?.trial_expires_at,
          trialDurationDays: FREE_TRIAL_DURATION_DAYS,
          maxActiveCustomers: FREE_TRIAL_MAX_CUSTOMERS,
        });
      }

      // Handle explicit business logic rejection exceptions from RPC
      if (rpcErr.message?.includes('ALREADY_PAID')) {
        return NextResponse.json(
          { error: 'Workspace already has an active paid subscription or lifetime license.' },
          { status: 409 }
        );
      }

      if (rpcErr.message?.includes('TRIAL_ALREADY_USED')) {
        return NextResponse.json(
          { error: 'The 14-day free trial has already been activated for this workspace.' },
          { status: 409 }
        );
      }

      if (rpcErr.message?.includes('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Only the workspace owner can activate the 14-day free trial.' },
          { status: 403 }
        );
      }

      console.warn('RPC start_free_trial failed, attempting server-side fallback:', rpcErr.message);
    } catch (rpcCallErr) {
      console.warn('RPC start_free_trial call failed:', rpcCallErr);
    }

    // 3. Fallback: Direct table operations if RPC has not yet been applied to remote Supabase
    const { data: existingSub } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (existingSub) {
      if (
        existingSub.status === 'active' &&
        (existingSub.is_lifetime ||
          existingSub.billing_type === 'monthly_subscription' ||
          existingSub.billing_type === 'lifetime_purchase')
      ) {
        return NextResponse.json(
          { error: 'Workspace already has an active paid subscription or lifetime license.' },
          { status: 409 }
        );
      }

      if (
        existingSub.trial_status === 'active' ||
        existingSub.trial_status === 'expired' ||
        existingSub.trial_status === 'converted' ||
        existingSub.trial_started_at
      ) {
        return NextResponse.json(
          { error: 'The 14-day free trial has already been activated for this workspace.' },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    const expires = new Date(now.getTime() + FREE_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const { error: upsertErr } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: businessId,
        plan_id: 'free_trial',
        billing_type: 'free_trial',
        status: 'trialing',
        max_active_customers: FREE_TRIAL_MAX_CUSTOMERS,
        trial_status: 'active',
        trial_started_at: now.toISOString(),
        trial_expires_at: expires.toISOString(),
        trial_duration_days: FREE_TRIAL_DURATION_DAYS,
        trial_activated_by: user.id,
        updated_at: now.toISOString(),
      }, { onConflict: 'business_id' });

    if (upsertErr) {
      console.error('Failed to upsert free trial subscription:', upsertErr);
      return NextResponse.json(
        { error: 'Could not activate trial in database. Please try again.' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activities').insert({
      business_id: businessId,
      actor_user_id: user.id,
      action_type: 'TRIAL_STARTED',
      description: `Activated 14-day free trial with ${FREE_TRIAL_MAX_CUSTOMERS} active customer capacity (expires ${expires.toISOString()})`,
    });

    return NextResponse.json({
      success: true,
      businessId,
      trialStatus: 'active',
      trialStartedAt: now.toISOString(),
      trialExpiresAt: expires.toISOString(),
      trialDurationDays: FREE_TRIAL_DURATION_DAYS,
      maxActiveCustomers: FREE_TRIAL_MAX_CUSTOMERS,
    });
  } catch (err: any) {
    console.error('Error starting free trial:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while starting free trial.' },
      { status: 500 }
    );
  }
}
