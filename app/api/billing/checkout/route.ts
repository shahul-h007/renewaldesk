import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlanById, PLANS, FOUNDING_LIFETIME_MAX_SLOTS } from '@/lib/billing/plans';
import { getRazorpayInstance, getRazorpayCredentials } from '@/lib/billing/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, planId } = body;

    if (!businessId || !planId) {
      return NextResponse.json({ error: 'Missing businessId or planId.' }, { status: 400 });
    }

    // 1. Verify that user is owner or manager of this business workspace
    const { data: membership, error: memberErr } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !membership) {
      return NextResponse.json(
        { error: 'You are not an authorized member of this business workspace.' },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only business owners or managers can modify billing and upgrade plans.' },
        { status: 403 }
      );
    }

    // 2. Validate plan from trusted server configuration
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    const { keyId, isConfigured } = getRazorpayCredentials();
    if (!isConfigured) {
      return NextResponse.json(
        { error: 'Razorpay is not yet configured on this server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
        { status: 503 }
      );
    }

    const razorpay = getRazorpayInstance();

    // 3. Handle Founding Lifetime Plan (One-Time Order)
    if (plan.id === 'founding_lifetime') {
      // Check current active lifetime subscriptions count
      const { count, error: countErr } = await supabase
        .from('business_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_lifetime', true)
        .eq('status', 'active');

      if (!countErr && (count ?? 0) >= FOUNDING_LIFETIME_MAX_SLOTS) {
        return NextResponse.json(
          { error: 'All 25 Founding Lifetime launch slots have been claimed.' },
          { status: 400 }
        );
      }

      // Create Razorpay Order for one-time payment
      const order = await razorpay.orders.create({
        amount: plan.pricePaise, // ₹599 = 59900 paise
        currency: 'INR',
        receipt: `ord_${businessId.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: {
          businessId,
          userId: user.id,
          planId: plan.id,
          billingType: 'lifetime_purchase',
        },
      });

      // Log transaction as 'created'
      await supabase.from('payment_transactions').insert({
        business_id: businessId,
        user_id: user.id,
        plan_id: plan.id,
        billing_type: 'lifetime_purchase',
        amount_paise: plan.pricePaise,
        currency: 'INR',
        status: 'created',
        razorpay_order_id: order.id,
        metadata: {
          receipt: order.receipt,
        },
      });

      return NextResponse.json({
        type: 'order',
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        planId: plan.id,
        planName: plan.name,
        priceINR: plan.priceINR,
        maxActiveCustomers: plan.maxActiveCustomers,
      });
    }

    // 4. Handle Recurring Monthly Subscription Plans
    // Find Razorpay Plan ID from environment
    const envKey = plan.planIdEnvKey;
    let razorpayPlanId = envKey ? process.env[envKey] : null;

    if (!razorpayPlanId) {
      // If plan ID is not set in env, check or create standard plan dynamically
      try {
        const createdPlan = await razorpay.plans.create({
          period: 'monthly',
          interval: 1,
          item: {
            name: `RenewalDesk ${plan.name} Plan`,
            amount: plan.pricePaise,
            currency: 'INR',
            description: `Monthly subscription for RenewalDesk ${plan.name} (${plan.maxActiveCustomers} active customers)`,
          },
        });
        razorpayPlanId = createdPlan.id;
      } catch (planErr: any) {
        console.error('Error finding or creating Razorpay subscription plan:', planErr);
        return NextResponse.json(
          {
            error: `Razorpay plan for ${plan.name} is not configured. Set ${envKey} in server environment or configure subscription plans in Razorpay dashboard.`,
          },
          { status: 500 }
        );
      }
    }

    // Create Subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 120, // 10 years monthly max
      quantity: 1,
      customer_notify: 1,
      notes: {
        businessId,
        userId: user.id,
        planId: plan.id,
        billingType: 'monthly_subscription',
      },
    });

    // Log transaction as 'created'
    await supabase.from('payment_transactions').insert({
      business_id: businessId,
      user_id: user.id,
      plan_id: plan.id,
      billing_type: 'monthly_subscription',
      amount_paise: plan.pricePaise,
      currency: 'INR',
      status: 'created',
      razorpay_subscription_id: subscription.id,
      metadata: {
        plan_id: razorpayPlanId,
      },
    });

    return NextResponse.json({
      type: 'subscription',
      subscriptionId: subscription.id,
      keyId,
      planId: plan.id,
      planName: plan.name,
      priceINR: plan.priceINR,
      maxActiveCustomers: plan.maxActiveCustomers,
    });
  } catch (err: any) {
    console.error('Checkout session creation error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize payment checkout session.' },
      { status: 500 }
    );
  }
}
