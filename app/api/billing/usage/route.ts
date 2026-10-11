import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlanById, PLANS, FOUNDING_LIFETIME_MAX_SLOTS, DEFAULT_TRIAL_CUSTOMER_LIMIT } from '@/lib/billing/plans';

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
    const planId = sub?.plan_id || 'starter';
    const plan = getPlanById(planId) || PLANS.starter;
    const maxCapacity = sub?.max_active_customers || plan.maxActiveCustomers || DEFAULT_TRIAL_CUSTOMER_LIMIT;
    const remainingCapacity = Math.max(0, maxCapacity - active);
    const isAtCapacity = active >= maxCapacity;
    const isOverCapacity = active > maxCapacity;

    return NextResponse.json({
      subscription: sub || null,
      usage: {
        activeCount: active,
        archivedCount: archived,
        maxCapacity,
        remainingCapacity,
        isAtCapacity,
        isOverCapacity,
        planId: plan.id,
        planName: plan.name,
        isLifetime: sub?.is_lifetime || false,
        status: sub?.status || 'trialing',
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
