import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getPlanById,
  PLANS,
  FOUNDING_LIFETIME_MAX_SLOTS,
  FREE_TRIAL_MAX_CUSTOMERS,
  getTrialInfo,
} from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId parameter.' }, { status: 400 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    // 1. Fetch current subscription
    const { data: sub } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    // 2. Count active and archived customers
    const { count: activeCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .is('archived_at', null);

    const { count: archivedCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .not('archived_at', 'is', null);

    // 3. Count total claimed lifetime slots across platform
    const { count: lifetimeCount } = await supabase
      .from('business_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_lifetime', true)
      .eq('status', 'active');

    const active = activeCount ?? 0;
    const archived = archivedCount ?? 0;

    // 4. Resolve trial status using authoritative helper
    const trialInfo = getTrialInfo(sub);

    let planId = 'not_started';
    let planName = 'Trial Not Started';
    let maxCapacity = 0;
    let remainingCapacity = 0;
    let isTrial = true;

    if (
      sub &&
      sub.status === 'active' &&
      (sub.is_lifetime ||
        sub.billing_type === 'monthly_subscription' ||
        sub.billing_type === 'lifetime_purchase')
    ) {
      // Paid plan or Founding Lifetime
      const paidPlan = getPlanById(sub.plan_id) || PLANS.starter;
      planId = paidPlan.id;
      planName = paidPlan.name;
      maxCapacity = sub.max_active_customers || paidPlan.maxActiveCustomers;
      remainingCapacity = Math.max(0, maxCapacity - active);
      isTrial = false;
    } else if (trialInfo.isNotStarted) {
      planId = 'not_started';
      planName = 'Trial Not Started';
      maxCapacity = 0;
      remainingCapacity = 0;
      isTrial = true;
    } else if (trialInfo.isExpired) {
      planId = 'free_trial';
      planName = 'Free Trial (Expired)';
      maxCapacity = FREE_TRIAL_MAX_CUSTOMERS;
      remainingCapacity = 0; // Expired trial blocks new additions
      isTrial = true;
    } else {
      // Active trial
      planId = 'free_trial';
      planName = '14-Day Free Trial';
      maxCapacity = FREE_TRIAL_MAX_CUSTOMERS;
      remainingCapacity = Math.max(0, maxCapacity - active);
      isTrial = true;
    }

    const isAtCapacity = maxCapacity > 0 ? active >= maxCapacity : true;
    const isOverCapacity = maxCapacity > 0 ? active > maxCapacity : false;

    return NextResponse.json({
      subscription: sub || null,
      trial: trialInfo,
      usage: {
        activeCount: active,
        archivedCount: archived,
        maxCapacity,
        remainingCapacity,
        isAtCapacity,
        isOverCapacity,
        planId,
        planName,
        isLifetime: sub?.is_lifetime || false,
        isTrial,
        isTrialActive: trialInfo.isActive,
        isTrialExpired: trialInfo.isExpired,
        isTrialNotStarted: trialInfo.isNotStarted,
        countdownLabel: trialInfo.countdownLabel,
        daysRemaining: trialInfo.daysRemaining,
        trialExpiresAt: trialInfo.expiresAt,
        status: sub?.status || (trialInfo.isNotStarted ? 'incomplete' : 'trialing'),
        currentPeriodEnd: sub?.current_period_end || null,
        cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      },
      lifetimeSlotsClaimed: lifetimeCount ?? 0,
      lifetimeSlotsTotal: FOUNDING_LIFETIME_MAX_SLOTS,
      role: membership.role,
    });
  } catch (err: any) {
    console.error('Error fetching billing usage:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch usage data.' }, { status: 500 });
  }
}
