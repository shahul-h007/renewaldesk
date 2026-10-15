import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { getPlanById, PLANS } from '@/lib/billing/plans';
import { getWebhookSupabaseClient } from '@/lib/billing/webhook-client';

export const dynamic = 'force-dynamic';

interface ClaimResult {
  outcome: 'claimed' | 'already_processed' | 'in_flight';
  ignored?: boolean;
}

/**
 * Atomically claims a webhook event so that concurrent workers cannot both process
 * a new event, nor concurrently reclaim the same failed or stale event.
 */
async function claimWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  eventPayload: any
): Promise<ClaimResult> {
  // 1. Attempt database RPC function with FOR UPDATE row lock if available
  const { data: rpcData, error: rpcErr } = await supabase.rpc('claim_webhook_event', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_payload: eventPayload,
    p_stale_seconds: 60,
  });

  if (!rpcErr) {
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      const claim = rpcData[0];
      if (claim.claim_status === 'already_completed') {
        return { outcome: 'already_processed', ignored: claim.event_status === 'ignored' };
      }
      if (claim.claim_status === 'in_flight') {
        return { outcome: 'in_flight' };
      }
      if (claim.claim_status === 'claimed') {
        return { outcome: 'claimed' };
      }
    }
  } else {
    // Only fall back to optimistic table-level locking if the RPC is explicitly unavailable in PostgreSQL schema cache
    const isRpcUnavailable =
      rpcErr.code === '42883' || // PostgreSQL undefined_function
      rpcErr.code === 'PGRST202' || // PostgREST function not found in schema cache
      rpcErr.message?.includes('claim_webhook_event');

    if (!isRpcUnavailable) {
      // Unexpected RPC database failure: do NOT silently hide or swallow!
      throw new Error(`Database error during webhook claim RPC: [${rpcErr.code}] ${rpcErr.message}`);
    }

    console.warn('[Webhook Claim] claim_webhook_event RPC unavailable; falling back to optimistic table-level locking.');
  }

  // 2. Table-level atomic claim fallback (Optimistic Conditional Locking)
  const nowIso = new Date().toISOString();

  // Attempt initial insert as 'processing'
  const { error: insertErr } = await supabase.from('webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    payload: eventPayload,
    status: 'processing',
    processed_at: nowIso,
  });

  if (!insertErr) {
    return { outcome: 'claimed' };
  }

  // If unique-key conflict (23505), the event already exists in the ledger
  if (insertErr.code === '23505') {
    const { data: existing, error: selectErr } = await supabase
      .from('webhook_events')
      .select('status, processed_at, error_message')
      .eq('event_id', eventId)
      .maybeSingle();

    if (selectErr || !existing) {
      throw new Error(`Failed to query existing webhook event ledger: ${selectErr?.message || 'Row not found'}`);
    }

    // Finished states: already processed
    if (existing.status === 'completed' || existing.status === 'processed') {
      return { outcome: 'already_processed' };
    }
    if (existing.status === 'ignored') {
      return { outcome: 'already_processed', ignored: true };
    }

    const processedTime = existing.processed_at ? new Date(existing.processed_at).getTime() : 0;
    const elapsedMs = Date.now() - processedTime;

    // Active in-flight processing (< 60s): serialize concurrent worker
    if (existing.status === 'processing') {
      if (elapsedMs < 60000) {
        return { outcome: 'in_flight' };
      }

      // Stale processing (> 60s, prior worker likely timed out or crashed):
      // Atomically reclaim via conditional update on old processed_at timestamp
      const { data: reclaimed, error: reclaimErr } = await supabase
        .from('webhook_events')
        .update({
          status: 'processing',
          processed_at: nowIso,
          error_message: null,
        })
        .eq('event_id', eventId)
        .eq('status', 'processing')
        .eq('processed_at', existing.processed_at)
        .select('id');

      if (reclaimErr || !reclaimed || reclaimed.length === 0) {
        // Another worker claimed this stale event first
        return { outcome: 'in_flight' };
      }
      return { outcome: 'claimed' };
    }

    // Failed state: atomically reclaim via conditional update on status = 'failed'
    if (existing.status === 'failed') {
      const { data: reclaimed, error: reclaimErr } = await supabase
        .from('webhook_events')
        .update({
          status: 'processing',
          processed_at: nowIso,
          error_message: null,
        })
        .eq('event_id', eventId)
        .eq('status', 'failed')
        .select('id');

      if (reclaimErr || !reclaimed || reclaimed.length === 0) {
        // Another worker reclaimed this failed event first
        return { outcome: 'in_flight' };
      }
      return { outcome: 'claimed' };
    }
  }

  // Any other error (including check constraint violations if migration not applied): fail fast!
  throw new Error(`Failed to claim webhook event: [${insertErr.code}] ${insertErr.message}`);
}

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

    // Razorpay sends unique event ID in 'x-razorpay-event-id' header; fallback to event.id or synthetic ID
    eventId =
      headerEventId ||
      event?.id ||
      (eventType ? `${eventType}_${paymentEntity?.id || orderEntity?.id || subEntity?.id || Date.now()}` : '');

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Malformed webhook payload.' }, { status: 400 });
    }

    supabase = getWebhookSupabaseClient();

    // 2. Atomic Event Claim (guarantees single-worker execution across new, failed, and stale deliveries)
    const claim = await claimWebhookEvent(supabase, eventId, eventType, event);

    if (claim.outcome === 'already_processed') {
      return NextResponse.json({ status: 'already_processed', eventId, ignored: claim.ignored });
    }

    if (claim.outcome === 'in_flight') {
      return NextResponse.json(
        { status: 'processing', message: 'Event is currently being processed by another worker.' },
        { status: 429 }
      );
    }

    // 3. Handle Order Paid / One-Time Founding Lifetime Payment
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
        const paymentAmount = paymentEntity?.amount;
        const paymentCurrency = paymentEntity?.currency;
        const paymentStatus = paymentEntity?.status;

        // Strict payment validation: never substitute defaults or allow missing captured status
        if (!paymentId || !orderId) {
          throw new Error('Malformed order payload: missing paymentId or orderId.');
        }

        const expectedLifetimePaise = PLANS.founding_lifetime.pricePaise;
        if (typeof paymentAmount !== 'number' || paymentAmount !== expectedLifetimePaise) {
          throw new Error(
            `Payment validation failed: Invalid lifetime amount ${paymentAmount}. Expected ${expectedLifetimePaise} paise.`
          );
        }

        if (paymentCurrency !== 'INR') {
          throw new Error(`Payment validation failed: Invalid currency '${paymentCurrency}'. Expected INR.`);
        }

        // Strict requirement: reject missing, null, or non-captured payment status
        if (!paymentStatus || paymentStatus !== 'captured') {
          throw new Error(
            `Payment validation failed: Invalid or missing payment status '${paymentStatus || 'missing'}'. Expected 'captured'.`
          );
        }

        // PRE-CLAIM IDENTITY CHECK:
        // If workspace already holds an active lifetime slot, it must be the exact same order and payment ID.
        // A different order or payment must be rejected immediately to prevent silent reattribution or transaction corruption.
        const { data: existingSub, error: preCheckErr } = await supabase
          .from('business_subscriptions')
          .select('is_lifetime, status, lifetime_slot_number, razorpay_order_id, razorpay_payment_id')
          .eq('business_id', businessId)
          .maybeSingle();

        if (preCheckErr) {
          throw new Error(`Failed to query existing subscription during lifetime pre-claim check: ${preCheckErr.message}`);
        }

        if (existingSub?.is_lifetime && existingSub?.status === 'active') {
          const isSamePurchase =
            existingSub.razorpay_order_id === orderId &&
            existingSub.razorpay_payment_id === paymentId;

          if (!isSamePurchase) {
            throw new Error(
              `Lifetime purchase rejected: Workspace already has an active lifetime slot (#${existingSub.lifetime_slot_number}) tied to order ${existingSub.razorpay_order_id} / payment ${existingSub.razorpay_payment_id}. Different order ${orderId} / payment ${paymentId} cannot claim this slot.`
            );
          }
        }

        // Call the authoritative atomic RPC function to claim the lifetime slot
        const { data: slotNumber, error: rpcErr } = await supabase.rpc('claim_founding_lifetime_slot', {
          p_business_id: businessId,
          p_user_id: userId || '00000000-0000-0000-0000-000000000000',
          p_order_id: orderId,
          p_payment_id: paymentId,
        });

        if (rpcErr) {
          throw new Error(`Authoritative lifetime slot claim failed: [${rpcErr.code}] ${rpcErr.message}`);
        }

        // POST-CLAIM IDENTITY VERIFICATION:
        // Ensure the persisted database record strictly binds to the incoming order and payment IDs
        const { data: verifiedSub, error: verifySubErr } = await supabase
          .from('business_subscriptions')
          .select('is_lifetime, status, lifetime_slot_number, razorpay_order_id, razorpay_payment_id')
          .eq('business_id', businessId)
          .eq('is_lifetime', true)
          .eq('status', 'active')
          .maybeSingle();

        if (
          verifySubErr ||
          !verifiedSub ||
          !verifiedSub.lifetime_slot_number ||
          verifiedSub.razorpay_order_id !== orderId ||
          verifiedSub.razorpay_payment_id !== paymentId
        ) {
          throw new Error(
            `Lifetime purchase identity verification failed: Persisted subscription does not match incoming order ${orderId} or payment ${paymentId}.`
          );
        }

        // Record payment transaction with strictly validated amount and currency
        const { error: txErr } = await supabase.from('payment_transactions').upsert({
          business_id: businessId,
          user_id: userId || null,
          plan_id: 'founding_lifetime',
          billing_type: 'lifetime_purchase',
          amount_paise: paymentAmount,
          currency: paymentCurrency,
          status: 'captured',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          metadata: {
            webhook_event_id: eventId,
            slot_number: slotNumber ?? verifiedSub.lifetime_slot_number,
          },
        }, { onConflict: 'razorpay_payment_id' });

        if (txErr) {
          throw new Error(`Failed to record lifetime payment transaction: [${txErr.code}] ${txErr.message}`);
        }

        await recordWebhookCompleted(supabase, eventId, 'completed');
        return NextResponse.json({ success: true, eventId, plan: 'founding_lifetime' });
      }
    }

    // 4. Handle Subscription Charged (Successful Renewal / Initial Monthly Payment)
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

        const subId = subEntity?.id;
        const paymentId = paymentEntity?.id;
        const paymentAmount = paymentEntity?.amount;
        const paymentCurrency = paymentEntity?.currency;
        const paymentStatus = paymentEntity?.status;

        // Strict payment validation: never substitute defaults or allow missing captured status
        if (!subId || !paymentId) {
          throw new Error('Malformed subscription payload: missing subscription ID or payment ID.');
        }

        if (typeof paymentAmount !== 'number' || paymentAmount !== plan.pricePaise) {
          throw new Error(
            `Payment validation failed: Invalid subscription amount ${paymentAmount}. Expected ${plan.pricePaise} paise for ${plan.id}.`
          );
        }

        if (paymentCurrency !== 'INR') {
          throw new Error(`Payment validation failed: Invalid currency '${paymentCurrency}'. Expected INR.`);
        }

        // Strict requirement: reject missing, null, or non-captured payment status
        if (!paymentStatus || paymentStatus !== 'captured') {
          throw new Error(
            `Payment validation failed: Invalid or missing payment status '${paymentStatus || 'missing'}'. Expected 'captured'.`
          );
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
            razorpay_subscription_id: subId,
            razorpay_payment_id: paymentId,
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

        // Record payment transaction with strictly validated amount and currency
        const { error: txErr } = await supabase.from('payment_transactions').upsert({
          business_id: businessId,
          plan_id: plan.id,
          billing_type: 'monthly_subscription',
          amount_paise: paymentAmount,
          currency: paymentCurrency,
          status: 'captured',
          razorpay_subscription_id: subId,
          razorpay_payment_id: paymentId,
          metadata: {
            webhook_event_id: eventId,
          },
        }, { onConflict: 'razorpay_payment_id' });

        if (txErr) {
          throw new Error(`Failed to record subscription payment transaction: [${txErr.code}] ${txErr.message}`);
        }

        await recordWebhookCompleted(supabase, eventId, 'completed');
        return NextResponse.json({ success: true, eventId, plan: plan.id });
      }
    }

    // 5. Handle Subscription Cancelled
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

    // 6. Handle Subscription Halted / Past Due (Failed auto-renewal)
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

    // 7. Handle Payment Failed
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
    const diagnosticMessage = err?.message || 'Processing failed';
    console.error('Razorpay webhook processing error:', diagnosticMessage);

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
            error_message: diagnosticMessage,
          }, { onConflict: 'event_id' });
      } catch (ledgerErr) {
        console.error('Failed to record webhook failure in ledger:', ledgerErr);
      }
    }

    // Return generic error response to external callers; diagnostic details retained in server logs
    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}

// Helper to record completion safely (updating to 'completed' or 'ignored')
async function recordWebhookCompleted(supabase: SupabaseClient, eventId: string, status: 'completed' | 'ignored') {
  const { error: completeErr } = await supabase
    .from('webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('event_id', eventId);

  if (completeErr) {
    throw new Error(`Failed to update webhook event status: [${completeErr.code}] ${completeErr.message}`);
  }
}
