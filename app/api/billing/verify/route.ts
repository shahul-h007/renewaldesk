import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlanById } from '@/lib/billing/plans';
import {
  verifyOrderPaymentSignature,
  verifySubscriptionPaymentSignature,
} from '@/lib/billing/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      planId,
      orderId,
      subscriptionId,
      paymentId,
      signature,
    } = body;

    if (!businessId || !planId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing required payment verification parameters.' }, { status: 400 });
    }

    // 1. Verify user's business authorization
    const { data: membership, error: memberErr } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !membership || (membership.role !== 'owner' && membership.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized to modify billing for this business.' }, { status: 403 });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    // 2. Cryptographic Signature Verification
    let isValid = false;
    if (plan.id === 'founding_lifetime' && orderId) {
      isValid = verifyOrderPaymentSignature({ orderId, paymentId, signature });
    } else if (subscriptionId) {
      isValid = verifySubscriptionPaymentSignature({ subscriptionId, paymentId, signature });
    }

    if (!isValid) {
      // Record failed transaction attempt
      await supabase.from('payment_transactions').insert({
        business_id: businessId,
        user_id: user.id,
        plan_id: plan.id,
        billing_type: plan.billingType,
        amount_paise: plan.pricePaise,
        currency: 'INR',
        status: 'failed',
        razorpay_order_id: orderId || null,
        razorpay_subscription_id: subscriptionId || null,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        error_code: 'SIGNATURE_VERIFICATION_FAILED',
        error_description: 'Cryptographic signature did not match server expectation.',
      });

      return NextResponse.json(
        { error: 'Payment signature verification failed. This transaction cannot be verified.' },
        { status: 400 }
      );
    }

    // 3. Grant Entitlement & Update Database
    if (plan.id === 'founding_lifetime') {
      // Claim Lifetime Slot via atomic procedure or check
      const { data: slotNumber, error: rpcErr } = await supabase.rpc('claim_founding_lifetime_slot', {
        p_business_id: businessId,
        p_user_id: user.id,
        p_order_id: orderId,
        p_payment_id: paymentId,
      });

      if (rpcErr) {
        console.error('Error in claim_founding_lifetime_slot:', rpcErr);
        // Fallback upsert if function not yet applied locally
        const { error: upsertErr } = await supabase
          .from('business_subscriptions')
          .upsert({
            business_id: businessId,
            plan_id: 'founding_lifetime',
            billing_type: 'lifetime_purchase',
            status: 'active',
            max_active_customers: 100,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            is_lifetime: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'business_id' });

        if (upsertErr) {
          console.error('Fallback subscription upsert error:', upsertErr);
          return NextResponse.json(
            { error: 'Payment was verified, but saving subscription state failed due to database schema setup. Please contact support.' },
            { status: 500 }
          );
        }
      }

      // Log successful transaction
      await supabase.from('payment_transactions').insert({
        business_id: businessId,
        user_id: user.id,
        plan_id: plan.id,
        billing_type: 'lifetime_purchase',
        amount_paise: plan.pricePaise,
        currency: 'INR',
        status: 'captured',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        metadata: {
          slotNumber: slotNumber ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        planId: plan.id,
        planName: plan.name,
        maxActiveCustomers: 100,
        isLifetime: true,
        slotNumber: slotNumber ?? null,
      });
    }

    // Monthly recurring subscription activation
    const currentPeriodStart = new Date().toISOString();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: subErr } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: businessId,
        plan_id: plan.id,
        billing_type: 'monthly_subscription',
        status: 'active',
        max_active_customers: plan.maxActiveCustomers,
        razorpay_subscription_id: subscriptionId,
        razorpay_payment_id: paymentId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
        is_lifetime: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' });

    if (subErr) {
      console.error('Error activating subscription in DB:', subErr);
      return NextResponse.json(
        { error: 'Payment was verified, but saving subscription state failed. Please contact support.' },
        { status: 500 }
      );
    }

    // Log successful transaction
    await supabase.from('payment_transactions').insert({
      business_id: businessId,
      user_id: user.id,
      plan_id: plan.id,
      billing_type: 'monthly_subscription',
      amount_paise: plan.pricePaise,
      currency: 'INR',
      status: 'captured',
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    // Log activity
    await supabase.from('activities').insert({
      business_id: businessId,
      actor_user_id: user.id,
      action_type: 'SUBSCRIPTION_ACTIVATED',
      description: `Upgraded to RenewalDesk ${plan.name} Plan (Capacity: ${plan.maxActiveCustomers} active customers).`,
    });

    return NextResponse.json({
      success: true,
      planId: plan.id,
      planName: plan.name,
      maxActiveCustomers: plan.maxActiveCustomers,
      currentPeriodEnd,
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected payment verification error.' },
      { status: 500 }
    );
  }
}
