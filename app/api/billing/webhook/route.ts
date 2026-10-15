import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { getPlanById } from '@/lib/billing/plans';
import { getWebhookSupabaseClient } from '@/lib/billing/webhook-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let supabase: SupabaseClient | null = null;
  let eventId = '';
  let eventType = '';
  let eventPayload: any = null;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 1. Signature Verification on exact raw body
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    eventPayload = event;
    const headerEventId = request.headers.get('x-razorpay-event-id');
    eventType = event?.event;
    const payload = event?.payload || {};

    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;
    const subEntity = payload?.subscription?.entity;

    // Razorpay sends unique event ID in 'x-razorpay-event-id' header; fallback to event.id or deterministic synthetic ID
    eventId =
      headerEventId ||
      event?.id ||
      (eventType ? `${eventType}_${paymentEntity?.id || orderEntity?.id || subEntity?.id || Date.now()}` : '');

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Malformed webhook payload: missing event ID or type.' }, { status: 400 });
    }

    supabase = getWebhookSupabaseClient();

    // 2. Recoverable Idempotency Check
    const { data: existingEvent, error: selectErr } = await supabase
      .from('webhook_events')
      .select('id, status, error_message, processed_at')
      .eq('event_id', eventId)
      .maybeSingle();

    if (selectErr) {
      throw new Error(`Database error querying webhook_events ledger: [${selectErr.code}] ${selectErr.message}`);
    }

    if (existingEvent) {
      // If already fully completed or legacy processed: safely return without repeating side effects
      if (existingEvent.status === 'completed' || existingEvent.status === 'processed') {
        return NextResponse.json({ status: 'already_processed', eventId });
      }

      // If already marked as ignored (e.g. test ping without workspace notes)
      if (existingEvent.status === 'ignored') {
        return NextResponse.json({ status: 'already_processed', eventId, ignored: true });
      }

      // If currently processing: prevent duplicate concurrent execution
      if (existingEvent.status === 'processing') {
        const processedAt = existingEvent.processed_at ? new Date(existingEvent.processed_at).getTime() : Date.now();
        const elapsedMs = Date.now() - processedAt;
        // If started less than 60 seconds ago, consider it an active in-flight execution
        if (elapsedMs < 60000) {
          return NextResponse.json(
            { status: 'processing', message: 'Event is currently being processed by another worker.' },
            { status: 429 }
          );
        }
        // If older than 60s, prior worker likely crashed or timed out; allow retry
      }

      // If status is 'failed' (or stale 'processing'), transition back to 'processing' for retry
      const { error: resetErr } = await supabase
        .from('webhook_events')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('event_id', eventId);

      if (resetErr) {
        throw new Error(`Failed to update webhook event status to processing: [${resetErr.code}] ${resetErr.message}`);
      }
    } else {
      // 3. Record new event in webhook_events as 'processing' (or 'processed' fallback if constraint not yet expanded)
      const { error: insertErr } = await supabase.from('webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        payload: event,
        status: 'processing',
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          // Handled by concurrent duplicate delivery race condition
          return NextResponse.json({ status: 'already_processed', eventId });
        }
        // If check constraint violation (code 23514) due to pre-migration database, fallback to 'processed'
        if (insertErr.code === '23514') {
          const { error: fallbackInsertErr } = await supabase.from('webhook_events').insert({
            event_id: eventId,
            event_type: eventType,
            payload: event,
            status: 'processed',
          });
          if (fallbackInsertErr && fallbackInsertErr.code !== '23505') {
            throw new Error(`Failed to record webhook event in ledger: [${fallbackInsertErr.code}] ${fallbackInsertErr.message}`);
          }
        } else {
          throw new Error(`Failed to record webhook event in ledger: [${insertErr.code}] ${insertErr.message}`);
        }
      }
    }

    // 4. Handle Order Paid / One-Time Founding Lifetime Payment
    if (eventType === 'order.paid' || (eventType === 'payment.captured' && paymentEntity?.order_id && !payload?.subscription)) {
      const notes = orderEntity?.notes || paymentEntity?.notes || {};
      const businessId = notes?.businessId;
      const userId = notes?.userId;
      const planId = notes?.planId;
      const billingType = notes?.billingType;

      if (!businessId) {
        // Acknowledge unlinked payment/order without failing
        await recordWebhookCompleted(supabase, eventId, 'ignored');
        return NextResponse.json({
          success: true,
          eventId,
          notice: 'Event acknowledged; skipped lifetime provisioning because no workspace businessId was present in notes.',
        });
      }

      if (billingType === 'lifetime_purchase' || planId === 'founding_lifetime') {
        const orderId = orderEntity?.id || paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;

        if (!paymentId || !orderId) {
          throw new Error('Malformed order payload: missing paymentId or orderId.');
        }

        // Call the authoritative atomic RPC function to claim the lifetime slot
        const { data: slotNumber, error: rpcErr } = await supabase.rpc('claim_founding_lifetime_slot', {
          p_business_id: businessId,
          p_user_id: userId || '00000000-0000-0000-0000-000000000000',
          p_order_id: orderId,
          p_payment_id: paymentId,
        });

        if (rpcErr) {
          // Check if this business already has an active lifetime slot (confirmed duplicate claim)
          const { data: existingSub } = await supabase
            .from('business_subscriptions')
            .select('is_lifetime, status, lifetime_slot_number')
            .eq('business_id', businessId)
            .eq('is_lifetime', true)
            .eq('status', 'active')
            .maybeSingle();

          if (!existingSub || !existingSub.lifetime_slot_number) {
            // STRICT SECURITY: Do not bypass RPC failure with direct upsert!
            // Reject and throw so the transaction is not granted without authoritative slot assignment.
            throw new Error(`Authoritative lifetime slot claim failed: [${rpcErr.code}] ${rpcErr.message}`);
          }
        }

        // Record payment transaction
        const { error: txErr } = await supabase.from('payment_transactions').upsert({
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

        if (txErr) {
          throw new Error(`Failed to record lifetime payment transaction: [${txErr.code}] ${txErr.message}`);
        }

        await recordWebhookCompleted(supabase, eventId, 'completed');
        return NextResponse.json({ success: true, eventId, plan: 'founding_lifetime' });
      }
    }

    // 5. Handle Subscription Charged (Successful Renewal / Initial Monthly Payment)
    if (eventType === 'subscription.charged') {
      const notes = subEntity?.notes || {};
      const businessId = notes?.businessId;
      const planId = notes?.planId;

      if (!businessId) {
        // Razorpay Dashboard test ping or unlinked subscription
        await recordWebhookCompleted(supabase, eventId, 'ignored');
        return NextResponse.json({
          success: true,
          eventId,
          notice: 'Event acknowledged; skipped subscription provisioning because no workspace businessId was present in notes.',
        });
      }

      if (businessId && planId) {
        const plan = getPlanById(planId);
        if (!plan) {
          throw new Error(`Invalid planId '${planId}' specified in subscription notes.`);
        }

        const currentStart = subEntity?.current_start
          ? new Date(subEntity.current_start * 1000).toISOString()
          : new Date().toISOString();
        const currentEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: subErr } = await supabase
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

        if (subErr) {
          throw new Error(`Failed to update business subscription: [${subErr.code}] ${subErr.message}`);
        }

        // Record payment transaction
        if (paymentEntity?.id) {
          const { error: txErr } = await supabase.from('payment_transactions').upsert({
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

          if (txErr) {
            throw new Error(`Failed to record subscription payment transaction: [${txErr.code}] ${txErr.message}`);
          }
        }

        await recordWebhookCompleted(supabase, eventId, 'completed');
        return NextResponse.json({ success: true, eventId, plan: plan.id });
      }
    }

    // 6. Handle Subscription Cancelled
    if (eventType === 'subscription.cancelled') {
      const subId = subEntity?.id;
      if (subId) {
        const { error: cancelErr } = await supabase
          .from('business_subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', subId);

        if (cancelErr) {
          throw new Error(`Failed to update subscription to cancelled: [${cancelErr.code}] ${cancelErr.message}`);
        }
      }
      await recordWebhookCompleted(supabase, eventId, 'completed');
      return NextResponse.json({ success: true, eventId });
    }

    // 7. Handle Subscription Halted / Past Due (Failed auto-renewal)
    if (eventType === 'subscription.halted' || eventType === 'subscription.paused') {
      const subId = subEntity?.id;
      if (subId) {
        const { error: haltErr } = await supabase
          .from('business_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_subscription_id', subId);

        if (haltErr) {
          throw new Error(`Failed to update subscription to past_due: [${haltErr.code}] ${haltErr.message}`);
        }
      }
      await recordWebhookCompleted(supabase, eventId, 'completed');
      return NextResponse.json({ success: true, eventId });
    }

    // 8. Handle Payment Failed
    if (eventType === 'payment.failed') {
      const notes = paymentEntity?.notes || {};
      const businessId = notes?.businessId;

      if (businessId && paymentEntity?.id) {
        const { error: failErr } = await supabase.from('payment_transactions').upsert({
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

        if (failErr) {
          throw new Error(`Failed to record failed payment transaction: [${failErr.code}] ${failErr.message}`);
        }
      }
      await recordWebhookCompleted(supabase, eventId, 'completed');
      return NextResponse.json({ success: true, eventId });
    }

    // Unhandled event type acknowledged safely
    await recordWebhookCompleted(supabase, eventId, 'ignored');
    return NextResponse.json({ success: true, eventId, notice: `Unhandled event type ${eventType} recorded.` });
  } catch (err: any) {
    console.error('Razorpay webhook processing error:', err);

    // Record failure in webhook_events ledger so future retries are aware and permitted
    if (supabase && eventId) {
      try {
        await supabase
          .from('webhook_events')
          .upsert({
            event_id: eventId,
            event_type: eventType || 'unknown',
            payload: eventPayload || {},
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: err?.message || 'Processing failed',
          }, { onConflict: 'event_id' });
      } catch (ledgerErr) {
        console.error('Failed to record webhook failure in ledger:', ledgerErr);
      }
    }

    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}

// Helper to record completion safely (updating to 'completed' or 'processed')
async function recordWebhookCompleted(supabase: SupabaseClient, eventId: string, status: 'completed' | 'ignored') {
  const { error: completeErr } = await supabase
    .from('webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('event_id', eventId);

  if (completeErr && completeErr.code === '23514') {
    // Pre-migration fallback: if constraint doesn't have 'completed', update to 'processed'
    const { error: fallbackErr } = await supabase
      .from('webhook_events')
      .update({
        status: status === 'completed' ? 'processed' : status,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('event_id', eventId);

    if (fallbackErr) {
      throw new Error(`Failed to update webhook event status fallback: [${fallbackErr.code}] ${fallbackErr.message}`);
    }
  } else if (completeErr) {
    throw new Error(`Failed to update webhook event status: [${completeErr.code}] ${completeErr.message}`);
  }
}
