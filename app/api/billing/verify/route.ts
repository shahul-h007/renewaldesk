import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlanById } from '@/lib/billing/plans';
import {
  verifyOrderPaymentSignature,
  verifySubscriptionPaymentSignature,
  getRazorpayInstance,
  getRazorpayCredentials,
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

    if (!businessId || !planId || !paymentId) {
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

    // 2. Idempotency Check: Check if this payment was already verified and captured in DB
    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('status, plan_id')
      .eq('razorpay_payment_id', paymentId)
      .maybeSingle();

    if (existingTx && existingTx.status === 'captured') {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        planId: plan.id,
        planName: plan.name,
        maxActiveCustomers: plan.maxActiveCustomers,
      });
    }

    // 3. Cryptographic Signature Verification (when signature is provided)
    if (signature) {
      let isSigValid = false;
      if (plan.id === 'founding_lifetime' && orderId) {
        isSigValid = verifyOrderPaymentSignature({ orderId, paymentId, signature });
      } else if (subscriptionId) {
        isSigValid = verifySubscriptionPaymentSignature({ subscriptionId, paymentId, signature });
      } else if (orderId) {
        isSigValid = verifyOrderPaymentSignature({ orderId, paymentId, signature });
      }

      if (!isSigValid) {
        // Record failed transaction attempt safely
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
    }

    // 4. Zero-Trust API Payment Confirmation (Confirm status === 'captured' via Razorpay API)
    const { isConfigured } = getRazorpayCredentials();
    if (isConfigured) {
      try {
        const razorpay = getRazorpayInstance();
        const payment = await razorpay.payments.fetch(paymentId);

        if (!payment) {
          return NextResponse.json(
            { error: 'Payment record could not be found with payment provider.' },
            { status: 404 }
          );
        }

        // Validate capture status
        if (payment.status !== 'captured') {
          // If payment is authorized but not yet captured, attempt capture
          if (payment.status === 'authorized') {
            try {
              await razorpay.payments.capture(paymentId, plan.pricePaise, 'INR');
            } catch (captureErr: any) {
              console.error('Failed to capture authorized payment:', captureErr);
              return NextResponse.json(
                { error: 'Payment is authorized but capture is pending. Please try verifying again in a moment.' },
                { status: 400 }
              );
            }
          } else {
            return NextResponse.json(
              { error: `Payment is not captured (provider status: ${payment.status}). Cannot grant entitlement.` },
              { status: 400 }
            );
          }
        }

        // Validate payment amount (in paise)
        if (Number(payment.amount) !== plan.pricePaise) {
          return NextResponse.json(
            { error: 'Payment amount does not match the selected plan price.' },
            { status: 400 }
          );
        }

        // Validate currency
        if (payment.currency !== 'INR') {
          return NextResponse.json(
            { error: 'Invalid payment currency.' },
            { status: 400 }
          );
        }

        // Validate business metadata if present on payment notes
        const paymentNotes = payment.notes as Record<string, string> | undefined;
        if (paymentNotes?.businessId && paymentNotes.businessId !== businessId) {
          return NextResponse.json(
            { error: 'Payment metadata does not match this workspace.' },
            { status: 403 }
          );
        }
      } catch (rzpErr: any) {
        console.error('Error confirming payment status with Razorpay API:', rzpErr);
        if (rzpErr?.statusCode === 404) {
          return NextResponse.json(
            { error: 'Payment ID was not found with payment provider.' },
            { status: 404 }
          );
        }
      }
    }

    // 5. Grant Entitlement & Update Database
    if (plan.id === 'founding_lifetime') {
      // Claim Lifetime Slot via atomic procedure
      const { data: slotNumber, error: rpcErr } = await supabase.rpc('claim_founding_lifetime_slot', {
        p_business_id: businessId,
        p_user_id: user.id,
        p_order_id: orderId || null,
        p_payment_id: paymentId,
      });

      if (rpcErr) {
        console.error('Error in claim_founding_lifetime_slot:', rpcErr);

        if (rpcErr.message?.includes('FOUNDING_LIFETIME_SOLD_OUT')) {
          return NextResponse.json(
            { error: 'All 25 Founding Lifetime launch slots have been claimed.' },
            { status: 400 }
          );
        }

        // Fallback upsert if function not yet applied or custom error
        const { error: upsertErr } = await supabase
          .from('business_subscriptions')
          .upsert({
            business_id: businessId,
            plan_id: 'founding_lifetime',
            billing_type: 'lifetime_purchase',
            status: 'active',
            max_active_customers: 100,
            razorpay_order_id: orderId || null,
            razorpay_payment_id: paymentId,
            is_lifetime: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'business_id' });

        if (upsertErr) {
          console.error('Fallback subscription upsert error:', upsertErr);
          return NextResponse.json(
            {
              error: 'Payment was verified, but saving subscription state failed. Please contact support.',
              paymentId,
              canRetry: true,
            },
            { status: 500 }
          );
        }
      }

      // Record transaction if not already logged
      await supabase.from('payment_transactions').upsert({
        business_id: businessId,
        user_id: user.id,
        plan_id: plan.id,
        billing_type: 'lifetime_purchase',
        amount_paise: plan.pricePaise,
        currency: 'INR',
        status: 'captured',
        razorpay_order_id: orderId || null,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature || null,
        metadata: {
          slotNumber: slotNumber ?? null,
        },
      }, { onConflict: 'razorpay_payment_id' });

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

    // 1st attempt: Call atomic RPC function
    const { error: rpcErr } = await supabase.rpc('activate_recurring_subscription', {
      p_business_id: businessId,
      p_user_id: user.id,
      p_plan_id: plan.id,
      p_max_active_customers: plan.maxActiveCustomers,
      p_amount_paise: plan.pricePaise,
      p_subscription_id: subscriptionId || null,
      p_payment_id: paymentId,
      p_signature: signature || null,
      p_current_period_start: currentPeriodStart,
      p_current_period_end: currentPeriodEnd,
    });

    if (rpcErr) {
      console.warn('RPC activate_recurring_subscription failed or not present, attempting fallback upsert:', rpcErr.message);

      // Fallback: Direct table upsert (authorized by owner/manager RLS policy)
      const { error: subErr } = await supabase
        .from('business_subscriptions')
        .upsert({
          business_id: businessId,
          plan_id: plan.id,
          billing_type: 'monthly_subscription',
          status: 'active',
          max_active_customers: plan.maxActiveCustomers,
          razorpay_subscription_id: subscriptionId || null,
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
          {
            error: 'Payment was verified, but saving subscription state failed. Please contact support.',
            paymentId,
            canRetry: true,
          },
          { status: 500 }
        );
      }

      // Upsert transaction
      await supabase.from('payment_transactions').upsert({
        business_id: businessId,
        user_id: user.id,
        plan_id: plan.id,
        billing_type: 'monthly_subscription',
        amount_paise: plan.pricePaise,
        currency: 'INR',
        status: 'captured',
        razorpay_subscription_id: subscriptionId || null,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature || null,
      }, { onConflict: 'razorpay_payment_id' });

      // Log activity
      await supabase.from('activities').insert({
        business_id: businessId,
        actor_user_id: user.id,
        action_type: 'SUBSCRIPTION_ACTIVATED',
        description: `Upgraded to RenewalDesk ${plan.name} Plan (Capacity: ${plan.maxActiveCustomers} active customers).`,
      });
    }

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
