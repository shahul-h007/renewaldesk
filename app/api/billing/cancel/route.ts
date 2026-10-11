import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRazorpayInstance } from '@/lib/billing/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { businessId } = await request.json();
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 });
    }

    // Verify owner role
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the business owner can cancel a subscription.' }, { status: 403 });
    }

    const { data: sub } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (!sub || !sub.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active recurring subscription found to cancel.' }, { status: 404 });
    }

    if (sub.is_lifetime) {
      return NextResponse.json({ error: 'Founding Lifetime plans do not have recurring billing and cannot be cancelled.' }, { status: 400 });
    }

    // Cancel in Razorpay
    try {
      const razorpay = getRazorpayInstance();
      // cancel_at_cycle_end = 1
      await (razorpay.subscriptions as any).cancel(sub.razorpay_subscription_id, true);
    } catch (razorpayErr: any) {
      console.warn('Razorpay subscription cancellation notice:', razorpayErr?.message);
    }

    // Update in database
    await supabase
      .from('business_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId);

    // Record activity
    await supabase.from('activities').insert({
      business_id: businessId,
      actor_user_id: user.id,
      action_type: 'SUBSCRIPTION_CANCEL_REQUESTED',
      description: 'Requested subscription cancellation at the end of the current billing cycle.',
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription has been set to cancel at the end of the current billing cycle. Your access remains active until then.',
    });
  } catch (err: any) {
    console.error('Cancellation error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to cancel subscription.' }, { status: 500 });
  }
}
