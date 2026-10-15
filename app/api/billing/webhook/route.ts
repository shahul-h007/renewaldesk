import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { getPlanById } from '@/lib/billing/plans';

// Helper to get service/admin client for background webhook tasks
// Throws explicitly if SUPABASE_SERVICE_ROLE_KEY is missing to prevent silent RLS failures
function getWebhookSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for webhook processing.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 1. Signature Verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const headerEventId = request.headers.get('x-razorpay-event-id');
    const eventType = event?.event;
    const payload = event?.payload || {};

    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;
    const subEntity = payload?.subscription?.entity;

    // Razorpay sends unique event ID in 'x-razorpay-event-id' header; fallback to event.id or deterministic synthetic ID
    const eventId =
      headerEventId ||
      event?.id ||
      (eventType ? `${eventType}_${paymentEntity?.id || orderEntity?.id || subEntity?.id || Date.now()}` : '');

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Malformed webhook payload: missing event ID or type.' }, { status: 400 });
    }

    const supabase = getWebhookSupabaseClient();

    // 2. Idempotency Check
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ status: 'already_processed', eventId });
    }

    // 3. Record event in webhook_events
    const { error: insertErr } = await supabase.from('webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      payload: event,
      status: 'processed',
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Handled by concurrent duplicate delivery
        return NextResponse.json({ status: 'already_processed', eventId });
      }
      console.error('Error recording webhook event:', insertErr);
    }

    // 4. Handle Order Paid / One-Time Founding Lifetime Payment
    if (eventType === 'order.paid' || (eventType === 'payment.captured' && paymentEntity?.order_id && !payload?.subscription)) {
      const notes = orderEntity?.notes || paymentEntity?.notes || {};
      const businessId = notes?.businessId;
      const userId = notes?.userId;
      const planId = notes?.planId;
      const billingType = notes?.billingType;

      if (businessId && (billingType === 'lifetime_purchase' || planId === 'founding_lifetime')) {
        const orderId = orderEntity?.id || paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;

        if (paymentId && orderId) {
          // Claim Founding Lifetime Slot via atomic procedure
          const { data: slotNumber, error: rpcErr } = await supabase.rpc('claim_founding_lifetime_slot', {
            p_business_id: businessId,
            p_user_id: userId || '00000000-0000-0000-0000-000000000000',
            p_order_id: orderId,
            p_payment_id: paymentId,
          });

          if (rpcErr && !rpcErr.message?.includes('already assigned')) {
            console.warn('Webhook claim_founding_lifetime_slot warning, attempting fallback upsert:', rpcErr.message);
            await supabase
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
                trial_status: 'converted',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'business_id' });
          }

          // Record payment transaction
          await supabase.from('payment_transactions').upsert({
            business_id: businessId,
            user_id: userId || null,
            plan_id: 'founding_lifetime',
            billing_type: 'lifetime_purchase',
            amount_paise: paymentEntity?.amount || 59900,
            currency: paymentEntity?.currency || 'INR',
            status: 'captured',
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            metadata: {
              webhook_event_id: eventId,
              slot_number: slotNumber ?? null,
            },
          }, { onConflict: 'razorpay_payment_id' });

          return NextResponse.json({ success: true, eventId, plan: 'founding_lifetime' });
        }
      }
    }

    // 5. Handle Subscription Charged (Successful Renewal / Initial Monthly Payment)
    if (eventType === 'subscription.charged') {
      const notes = subEntity?.notes || {};
      const businessId = notes?.businessId;
      const planId = notes?.planId;

      if (!businessId) {
        // Razorpay Dashboard test ping or unlinked subscription
        return NextResponse.json({
          success: true,
          eventId,
          notice: 'Event acknowledged; skipped subscription provisioning because no workspace businessId was present in notes.',
        });
      }

      if (businessId && planId) {
        const plan = getPlanById(planId);
        if (plan) {
          const currentStart = subEntity?.current_start
            ? new Date(subEntity.current_start * 1000).toISOString()
            : new Date().toISOString();
          const currentEnd = subEntity?.current_end
            ? new Date(subEntity.current_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('business_subscriptions')
            .upsert({
              business_id: businessId,
              plan_id: plan.id,
              billing_type: 'monthly_subscription',
              status: 'active',
              max_active_customers: plan.maxActiveCustomers,
              razorpay_subscription_id: subEntity?.id,
              razorpay_payment_id: paymentEntity?.id || null,
              current_period_start: currentStart,
              current_period_end: currentEnd,
              cancel_at_period_end: false,
              is_lifetime: false,
              trial_status: 'converted',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'business_id' });

          // Record payment transaction
          if (paymentEntity?.id) {
            await supabase.from('payment_transactions').upsert({
              business_id: businessId,
              plan_id: plan.id,
              billing_type: 'monthly_subscription',
              amount_paise: paymentEntity.amount || plan.pricePaise,
              currency: paymentEntity.currency || 'INR',
              status: 'captured',
              razorpay_subscription_id: subEntity?.id,
              razorpay_payment_id: paymentEntity.id,
              metadata: {
                webhook_event_id: eventId,
              },
            }, { onConflict: 'razorpay_payment_id' });
          }

          return NextResponse.json({ success: true, eventId, plan: plan.id });
        }
      }
    }

    // 6. Handle Subscription Cancelled
    if (eventType === 'subscription.cancelled') {
      const subId = subEntity?.id;
      if (subId) {
        await supabase
          .from('business_subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', subId);
      }
      return NextResponse.json({ success: true, eventId });
    }

    // 7. Handle Subscription Halted / Past Due (Failed auto-renewal)
    if (eventType === 'subscription.halted' || eventType === 'subscription.paused') {
      const subId = subEntity?.id;
      if (subId) {
        await supabase
          .from('business_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', subId);
      }
      return NextResponse.json({ success: true, eventId });
    }

    // 8. Handle Payment Failed
    if (eventType === 'payment.failed') {
      const notes = paymentEntity?.notes || {};
      const businessId = notes?.businessId;

      if (businessId && paymentEntity?.id) {
        await supabase.from('payment_transactions').upsert({
          business_id: businessId,
          plan_id: notes.planId || 'unknown',
          billing_type: notes.billingType || 'unknown',
          amount_paise: paymentEntity.amount || 0,
          currency: paymentEntity.currency || 'INR',
          status: 'failed',
          razorpay_order_id: paymentEntity.order_id || null,
          razorpay_subscription_id: paymentEntity.subscription_id || null,
          razorpay_payment_id: paymentEntity.id,
          error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
          error_description: paymentEntity.error_description || 'Payment failed.',
          metadata: {
            webhook_event_id: eventId,
          },
        }, { onConflict: 'razorpay_payment_id' });
      }
      return NextResponse.json({ success: true, eventId });
    }

    return NextResponse.json({ success: true, eventId });
  } catch (err: any) {
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed.' }, { status: 500 });
  }
}
