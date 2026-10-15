import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { getPlanById } from '@/lib/billing/plans';

// Helper to get service/admin client for background webhook tasks
function getWebhookSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
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
    const eventId = event?.id;
    const eventType = event?.event;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Malformed webhook payload.' }, { status: 400 });
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

    const payload = event?.payload || {};

    // 4. Handle Subscription Charged (Successful Renewal / Initial Payment)
    if (eventType === 'subscription.charged') {
      const subEntity = payload?.subscription?.entity;
      const paymentEntity = payload?.payment?.entity;
      const notes = subEntity?.notes || {};
      const businessId = notes?.businessId;
      const planId = notes?.planId;

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
              razorpay_subscription_id: subEntity.id,
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
              razorpay_subscription_id: subEntity.id,
              razorpay_payment_id: paymentEntity.id,
              metadata: {
                webhook_event_id: eventId,
              },
            }, { onConflict: 'razorpay_payment_id' });
          }
        }
      }
    }

    // 5. Handle Subscription Cancelled
    if (eventType === 'subscription.cancelled') {
      const subEntity = payload?.subscription?.entity;
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
    }

    // 6. Handle Subscription Halted / Past Due (Failed auto-renewal)
    if (eventType === 'subscription.halted' || eventType === 'subscription.paused') {
      const subEntity = payload?.subscription?.entity;
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
    }

    // 7. Handle Payment Failed
    if (eventType === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
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
    }

    return NextResponse.json({ success: true, eventId });
  } catch (err: any) {
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed.' }, { status: 500 });
  }
}
