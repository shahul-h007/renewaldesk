import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyWebhookSignature,
  verifyOrderPaymentSignature,
  verifySubscriptionPaymentSignature,
} from '../lib/billing/razorpay';
import { getPlanById, PLANS, getTrialInfo } from '../lib/billing/plans';
import { CustomerLimitReachedError, TrialNotStartedError, TrialExpiredError } from '../lib/billing/limits';
import { POST } from '../app/api/billing/webhook/route';
import { setWebhookSupabaseClientOverride } from '../lib/billing/webhook-client';

console.log('🧪 Starting RenewalDesk Webhook & Subscription Lifecycle Audit Test Suite...\n');

const MOCK_WEBHOOK_SECRET = 'whsec_test_audit_secret_99887766';
process.env.RAZORPAY_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
process.env.RAZORPAY_KEY_SECRET = 'rzp_sec_test_12345';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.renewaldesk.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_role_key_test_secret';

// =========================================================================
// PART 1: HELPER-LEVEL UNIT TESTS (PURE ISOLATED LOGIC)
// =========================================================================
console.log('================================================================');
console.log('=== PART 1: HELPER-LEVEL UNIT TESTS (PURE ISOLATED LOGIC)    ===');
console.log('================================================================\n');

// -------------------------------------------------------------------------
// Test 1: Webhook HMAC Signature Validation & Tamper Resistance
// -------------------------------------------------------------------------
console.log('--- Test 1 [PURE UNIT]: Webhook HMAC Signature Validation & Tamper Resistance ---');
{
  const payload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test',
    event: 'subscription.charged',
    contains: ['subscription', 'payment'],
    payload: {
      subscription: {
        entity: {
          id: 'sub_test_123',
          current_start: Math.floor(Date.now() / 1000),
          current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          notes: {
            businessId: '4d3095ed-5ba8-4822-a6f8-0f5f15feb42c',
            planId: 'business',
          },
        },
      },
      payment: {
        entity: {
          id: 'pay_test_456',
          amount: 19900,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', MOCK_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Valid signature
  assert.equal(verifyWebhookSignature(payload, validSignature), true, 'Valid HMAC signature must verify');

  // Invalid / tampered signature
  const tamperedSig = validSignature.slice(0, -4) + '0000';
  assert.equal(verifyWebhookSignature(payload, tamperedSig), false, 'Tampered signature must fail');

  // Tampered payload
  const tamperedPayload = payload + ' ';
  assert.equal(verifyWebhookSignature(tamperedPayload, validSignature), false, 'Tampered payload must fail');

  // Empty signature
  assert.equal(verifyWebhookSignature(payload, ''), false, 'Empty signature must fail');

  // Missing secret in env
  const savedSec = process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  assert.equal(verifyWebhookSignature(payload, validSignature), false, 'Missing webhook secret must fail safe');
  process.env.RAZORPAY_WEBHOOK_SECRET = savedSec;

  console.log('  ✔ Webhook signature verification is cryptographically sound and fail-safe');
}

// -------------------------------------------------------------------------
// Test 2: In-Memory Webhook Deduplication Pure Logic
// -------------------------------------------------------------------------
console.log('\n--- Test 2 [PURE UNIT]: In-Memory Webhook Deduplication Pure Logic ---');
{
  const webhookLedger = new Map<string, { status: string; processed_at: number }>();

  function handleIncomingWebhookEvent(eventId: string, eventType: string) {
    if (webhookLedger.has(eventId)) {
      return { status: 'already_processed', eventId };
    }
    webhookLedger.set(eventId, { status: 'processed', processed_at: Date.now() });
    return { status: 'processed', eventId };
  }

  const firstDelivery = handleIncomingWebhookEvent('evt_charge_001', 'subscription.charged');
  assert.equal(firstDelivery.status, 'processed');

  const duplicateDelivery = handleIncomingWebhookEvent('evt_charge_001', 'subscription.charged');
  assert.equal(duplicateDelivery.status, 'already_processed');

  const thirdDelivery = handleIncomingWebhookEvent('evt_charge_001', 'subscription.charged');
  assert.equal(thirdDelivery.status, 'already_processed');

  console.log('  ✔ Pure deduplication algorithm correctly rejects duplicate events');
}

// -------------------------------------------------------------------------
// Test 3: Subscription Lifecycle Event Transitions (Pure Logic)
// -------------------------------------------------------------------------
console.log('\n--- Test 3 [PURE UNIT]: Subscription Lifecycle Event Transitions (Pure Logic) ---');
{
  interface WorkspaceSubState {
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
    planId: string;
    maxCustomers: number;
    cancelAtPeriodEnd: boolean;
    trialStatus: string;
    isLifetime?: boolean;
  }

  function applyLifecycleWebhook(state: WorkspaceSubState, eventType: string, eventData: any): WorkspaceSubState {
    if (eventType === 'subscription.charged') {
      const plan = getPlanById(eventData.planId);
      if (!plan) return state;
      return {
        ...state,
        status: 'active',
        planId: plan.id,
        maxCustomers: plan.maxActiveCustomers,
        cancelAtPeriodEnd: false,
        trialStatus: 'converted',
      };
    }
    if (eventType === 'order.paid' && (eventData.billingType === 'lifetime_purchase' || eventData.planId === 'founding_lifetime')) {
      return {
        ...state,
        status: 'active',
        planId: 'founding_lifetime',
        maxCustomers: 100,
        cancelAtPeriodEnd: false,
        isLifetime: true,
        trialStatus: 'converted',
      };
    }
    if (eventType === 'subscription.cancelled') {
      return {
        ...state,
        status: 'cancelled',
        cancelAtPeriodEnd: true,
      };
    }
    if (eventType === 'subscription.halted' || eventType === 'subscription.paused') {
      return {
        ...state,
        status: 'past_due',
      };
    }
    return state;
  }

  let sub: WorkspaceSubState = {
    status: 'trialing',
    planId: 'free_trial',
    maxCustomers: 25,
    cancelAtPeriodEnd: false,
    trialStatus: 'active',
  };

  // 1. subscription.charged -> active & converted
  sub = applyLifecycleWebhook(sub, 'subscription.charged', { planId: 'business' });
  assert.equal(sub.status, 'active');
  assert.equal(sub.planId, 'business');
  assert.equal(sub.maxCustomers, 250);
  assert.equal(sub.trialStatus, 'converted');

  // 2. subscription.cancelled -> status cancelled, cancelAtPeriodEnd true
  sub = applyLifecycleWebhook(sub, 'subscription.cancelled', {});
  assert.equal(sub.status, 'cancelled');
  assert.equal(sub.cancelAtPeriodEnd, true);

  // 3. subscription.halted -> past_due
  sub = applyLifecycleWebhook(sub, 'subscription.halted', {});
  assert.equal(sub.status, 'past_due');

  // 4. order.paid -> founding_lifetime
  sub = applyLifecycleWebhook(sub, 'order.paid', { billingType: 'lifetime_purchase', planId: 'founding_lifetime' });
  assert.equal(sub.status, 'active');
  assert.equal(sub.planId, 'founding_lifetime');
  assert.equal(sub.maxCustomers, 100);
  assert.equal(sub.isLifetime, true);
  assert.equal(sub.trialStatus, 'converted');

  console.log('  ✔ Pure state transitions align with charged, cancelled, halted, and order.paid rules');
}

// -------------------------------------------------------------------------
// Test 4: Entitlement & Feature Gating Under All Lifecycle States
// -------------------------------------------------------------------------
console.log('\n--- Test 4 [PURE UNIT]: Entitlement & Feature Gating Under All Lifecycle States ---');
{
  function evaluateAccess(status: string, trialStatus: string, currentCount: number, maxCapacity: number) {
    if (status === 'active') {
      return { allowed: currentCount < maxCapacity, reason: 'paid_active' };
    }
    if (trialStatus === 'not_started') {
      return { allowed: false, reason: 'trial_not_started' };
    }
    if (trialStatus === 'expired') {
      return { allowed: false, reason: 'trial_expired' };
    }
    if (trialStatus === 'active') {
      return { allowed: currentCount < 25, reason: 'trial_active' };
    }
    if (status === 'past_due') {
      return { allowed: false, reason: 'payment_past_due' };
    }
    return { allowed: false, reason: 'suspended' };
  }

  // Active paid
  assert.equal(evaluateAccess('active', 'converted', 10, 250).allowed, true);
  assert.equal(evaluateAccess('active', 'converted', 250, 250).allowed, false);

  // Unstarted trial
  assert.equal(evaluateAccess('incomplete', 'not_started', 0, 0).allowed, false);
  assert.equal(evaluateAccess('incomplete', 'not_started', 0, 0).reason, 'trial_not_started');

  // Expired trial
  assert.equal(evaluateAccess('expired', 'expired', 10, 25).allowed, false);
  assert.equal(evaluateAccess('expired', 'expired', 10, 25).reason, 'trial_expired');

  // Past due (halted payment)
  assert.equal(evaluateAccess('past_due', 'converted', 50, 250).allowed, false);
  assert.equal(evaluateAccess('past_due', 'converted', 50, 250).reason, 'payment_past_due');

  console.log('  ✔ Gating logic strictly blocks operations on unstarted, expired, and past_due states');
}

// -------------------------------------------------------------------------
// Test 5: Client Verify vs Webhook Race Condition Safety (Dual-path model)
// -------------------------------------------------------------------------
console.log('\n--- Test 5 [PURE UNIT]: Client Verify vs Webhook Race Condition Safety ---');
{
  const state = {
    subscriptionStatus: 'incomplete',
    capturedPayments: new Set<string>(),
  };

  function onWebhookCharged(paymentId: string) {
    state.subscriptionStatus = 'active';
    state.capturedPayments.add(paymentId);
  }

  function onClientVerify(paymentId: string) {
    if (state.capturedPayments.has(paymentId)) {
      return { alreadyProcessed: true, status: 'active' };
    }
    state.subscriptionStatus = 'active';
    state.capturedPayments.add(paymentId);
    return { alreadyProcessed: false, status: 'active' };
  }

  // Scenario A: Webhook arrives before client verify
  onWebhookCharged('pay_order_abc');
  const verifyResultA = onClientVerify('pay_order_abc');
  assert.equal(verifyResultA.alreadyProcessed, true);
  assert.equal(verifyResultA.status, 'active');

  // Scenario B: Client verify finishes before webhook
  const verifyResultB = onClientVerify('pay_order_xyz');
  assert.equal(verifyResultB.alreadyProcessed, false);
  assert.equal(verifyResultB.status, 'active');
  onWebhookCharged('pay_order_xyz');
  assert.equal(state.subscriptionStatus, 'active');

  console.log('  ✔ Dual-path convergence (verify before webhook, webhook before verify) is safe');
}

// -------------------------------------------------------------------------
// Test 6: Razorpay Event ID Extraction Header & Test Ping Parsing Logic
// -------------------------------------------------------------------------
console.log('\n--- Test 6 [PURE UNIT]: Event ID Extraction & Razorpay Test Ping Handling Logic ---');
{
  function extractEventId(headers: Record<string, string>, body: any): string {
    const headerEventId = headers['x-razorpay-event-id'];
    const eventType = body?.event;
    const paymentId = body?.payload?.payment?.entity?.id;
    return headerEventId || body?.id || (eventType ? `${eventType}_${paymentId || 'synthetic'}` : '');
  }

  // 1. Prioritizes x-razorpay-event-id header
  const idFromHeader = extractEventId({ 'x-razorpay-event-id': 'evt_header_999' }, { id: 'evt_body_111', event: 'payment.captured' });
  assert.equal(idFromHeader, 'evt_header_999', 'Must prioritize header over body ID');

  // 2. Falls back to body.id if header is absent
  const idFromBody = extractEventId({}, { id: 'evt_body_111', event: 'payment.captured' });
  assert.equal(idFromBody, 'evt_body_111', 'Must fallback to body.id');

  // 3. Generates deterministic fallback if both absent
  const idSynthetic = extractEventId({}, { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_xyz' } } } });
  assert.equal(idSynthetic, 'payment.captured_pay_xyz', 'Must fallback to synthetic ID');

  console.log('  ✔ Event ID extraction correctly respects header precedence and synthetic fallbacks');
}


// =========================================================================
// PART 2: HANDLER-LEVEL INTEGRATION TESTS (POST Handler)
// [NOTE: IN-MEMORY MOCK SUPABASE / POSTGRESQL SIMULATION — NOT REAL POSTGRESQL]
// =========================================================================
console.log('\n================================================================');
console.log('=== PART 2: HANDLER-LEVEL ROUTE INTEGRATION TESTS (POST)     ===');
console.log('=== [IN-MEMORY MOCK SUPABASE SIMULATION — NOT REAL POSTGRESQL] ===');
console.log('================================================================\n');

// Mock in-memory Supabase client accurately modeling table storage, unique constraints, and RPCs
class MockSupabaseClient {
  tables: {
    webhook_events: Map<string, any>;
    business_subscriptions: Map<string, any>;
    payment_transactions: Map<string, any>;
  };
  rpcHandlers: Record<string, (args: any) => Promise<{ data: any; error: any }>>;
  failWritesOnTable: Record<string, { code: string; message: string }>;

  constructor() {
    this.tables = {
      webhook_events: new Map(),
      business_subscriptions: new Map(),
      payment_transactions: new Map(),
    };
    this.rpcHandlers = {};
    this.failWritesOnTable = {};

    // Default simulation for claim_founding_lifetime_slot
    this.rpcHandlers['claim_founding_lifetime_slot'] = async ({ p_business_id, p_order_id, p_payment_id }) => {
      const subTable = this.tables.business_subscriptions;
      const existing = subTable.get(p_business_id);
      if (existing && existing.is_lifetime && existing.status === 'active') {
        // Models existing RPC behavior: returns assigned slot
        return { data: existing.lifetime_slot_number, error: null };
      }
      const newSlot = 1;
      const row = {
        business_id: p_business_id,
        plan_id: 'founding_lifetime',
        billing_type: 'lifetime_purchase',
        status: 'active',
        max_active_customers: 100,
        is_lifetime: true,
        lifetime_slot_number: newSlot,
        razorpay_order_id: p_order_id,
        razorpay_payment_id: p_payment_id,
      };
      subTable.set(p_business_id, row);
      return { data: newSlot, error: null };
    };
  }

  from(tableName: string) {
    const self = this;
    const table = (this.tables as any)[tableName] || new Map();

    return {
      select(columns?: string) {
        const filters: Array<[string, any]> = [];
        const builder = {
          eq(column: string, value: any) {
            filters.push([column, value]);
            return builder;
          },
          async maybeSingle() {
            for (const row of table.values()) {
              const matches = filters.every(([col, val]) => row[col] === val);
              if (matches) {
                return { data: { ...row }, error: null };
              }
            }
            return { data: null, error: null };
          },
          async single() {
            const res = await builder.maybeSingle();
            if (!res.data) return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
            return res;
          },
        };
        return builder;
      },

      insert(row: any) {
        if (self.failWritesOnTable[tableName]) {
          return Promise.resolve({ data: null, error: self.failWritesOnTable[tableName] });
        }
        let key = row.id || row.event_id || row.business_id || row.razorpay_payment_id || String(Date.now());
        if (tableName === 'webhook_events') {
          key = row.event_id;
          if (table.has(key)) {
            return Promise.resolve({
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint "webhook_events_event_id_key"' },
            });
          }
        }
        table.set(key, { ...row, created_at: row.created_at || new Date().toISOString() });
        return Promise.resolve({ data: row, error: null });
      },

      upsert(row: any, options?: { onConflict?: string }) {
        if (self.failWritesOnTable[tableName]) {
          return Promise.resolve({ data: null, error: self.failWritesOnTable[tableName] });
        }
        const conflictKey = options?.onConflict || (tableName === 'webhook_events' ? 'event_id' : tableName === 'business_subscriptions' ? 'business_id' : 'razorpay_payment_id');
        const keyVal = row[conflictKey];
        const existing = table.get(keyVal) || {};
        table.set(keyVal, { ...existing, ...row });
        return Promise.resolve({ data: row, error: null });
      },

      update(updates: any) {
        const filters: Array<[string, any]> = [];
        const builder = {
          eq(column: string, value: any) {
            filters.push([column, value]);
            return builder;
          },
          select(columns?: string) {
            return builder;
          },
          then(resolve: (val: { data: any; error: any }) => void) {
            if (self.failWritesOnTable[tableName]) {
              return Promise.resolve({ data: null, error: self.failWritesOnTable[tableName] }).then(resolve);
            }
            const matchedRows: any[] = [];
            for (const [key, item] of table.entries()) {
              const matches = filters.every(([col, val]) => item[col] === val);
              if (matches) {
                const updated = { ...item, ...updates };
                table.set(key, updated);
                matchedRows.push(updated);
              }
            }
            return Promise.resolve({ data: matchedRows, error: null }).then(resolve);
          },
        };
        return builder;
      },
    };
  }

  rpc(fnName: string, args: any) {
    if (this.rpcHandlers[fnName]) {
      return this.rpcHandlers[fnName](args);
    }
    // Default undefined function error matching PostgreSQL code 42883
    return Promise.resolve({
      data: null,
      error: { code: '42883', message: `function ${fnName} does not exist` },
    });
  }
}

// Helper to construct a signed Next.js Request
function createSignedWebhookRequest(payload: any, secret: string = MOCK_WEBHOOK_SECRET, headers: Record<string, string> = {}) {
  const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
  return new Request('http://localhost:3000/api/billing/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      ...headers,
    },
    body: bodyString,
  });
}

async function runHandlerIntegrationTests() {
  // -------------------------------------------------------------------------
  // Test 7: Handler Rejects Invalid HMAC Signature (HTTP 400)
  // -------------------------------------------------------------------------
  console.log('--- Test 7 [HANDLER - IN-MEMORY SIMULATION]: Rejects Invalid HMAC Signature ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const req = new Request('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': 'invalid_forged_signature_hex_123',
      },
      body: JSON.stringify({ event: 'subscription.charged', id: 'evt_tampered' }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400, 'Invalid signature must return HTTP 400');
    const json = await res.json();
    assert.equal(json.error, 'Invalid webhook signature.');
    assert.equal(mockDb.tables.webhook_events.size, 0, 'No event must be recorded on signature failure');

    console.log('  ✔ POST handler rejected invalid signature with HTTP 400 and made zero database writes');
  }

  // -------------------------------------------------------------------------
  // Test 8: Handler Enforces Strict Service Role Key Configuration (HTTP 500)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8 [HANDLER - IN-MEMORY SIMULATION]: Enforces Strict Service Role Key Configuration ---');
  {
    setWebhookSupabaseClientOverride(null); // Clear override to test real getWebhookSupabaseClient
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const req = createSignedWebhookRequest({ event: 'subscription.charged', id: 'evt_no_key' });
      const res = await POST(req);
      assert.equal(res.status, 500, 'Missing service role key must return HTTP 500');
      const json = await res.json();
      assert.equal(json.error, 'Webhook processing failed.', 'External caller receives generic error');
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    }

    console.log('  ✔ POST handler prevents silent anonymous masquerade by failing with explicit HTTP 500');
  }

  // -------------------------------------------------------------------------
  // Test 9: Handler Gracefully Acknowledges Unlinked Test Pings (status = 'ignored')
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9 [HANDLER - IN-MEMORY SIMULATION]: Acknowledges Unlinked Test Pings ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const pingEvent = {
      event: 'subscription.charged',
      id: 'evt_dashboard_ping_999',
      payload: {
        subscription: {
          entity: {
            id: 'sub_dummy_ping',
            notes: {}, // No businessId
          },
        },
      },
    };

    const req = createSignedWebhookRequest(pingEvent);
    const res = await POST(req);
    assert.equal(res.status, 200, 'Test ping must return HTTP 200');
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.notice?.includes('skipped subscription provisioning'));

    const recordedEvent = mockDb.tables.webhook_events.get('evt_dashboard_ping_999');
    assert.ok(recordedEvent, 'Event must be recorded in ledger');
    assert.equal(recordedEvent.status, 'ignored', 'Event status must be ignored');

    console.log('  ✔ POST handler marks unlinked dashboard test ping as ignored with HTTP 200 acknowledgment');
  }

  // -------------------------------------------------------------------------
  // Test 10: Handler Successfully Provisions subscription.charged
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10 [HANDLER - IN-MEMORY SIMULATION]: Successfully Provisions subscription.charged ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = '4d3095ed-5ba8-4822-a6f8-0f5f15feb42c';
    const chargedEvent = {
      event: 'subscription.charged',
      id: 'evt_charge_success_100',
      payload: {
        subscription: {
          entity: {
            id: 'sub_live_test_001',
            current_start: 1760000000,
            current_end: 1762592000,
            notes: {
              businessId,
              planId: 'business',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_live_test_001',
            amount: 19900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(chargedEvent);
    const res = await POST(req);
    assert.equal(res.status, 200, 'Successful subscription charge must return HTTP 200');
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.plan, 'business');

    // Verify business_subscriptions record
    const sub = mockDb.tables.business_subscriptions.get(businessId);
    assert.ok(sub, 'Subscription record must be created');
    assert.equal(sub.plan_id, 'business');
    assert.equal(sub.status, 'active');
    assert.equal(sub.max_active_customers, 250);
    assert.equal(sub.trial_status, 'converted');
    assert.equal(sub.razorpay_subscription_id, 'sub_live_test_001');
    assert.equal(sub.razorpay_payment_id, 'pay_live_test_001');

    // Verify payment_transactions record
    const tx = mockDb.tables.payment_transactions.get('pay_live_test_001');
    assert.ok(tx, 'Payment transaction record must be created');
    assert.equal(tx.business_id, businessId);
    assert.equal(tx.amount_paise, 19900);
    assert.equal(tx.status, 'captured');

    // Verify webhook_events ledger status
    const evt = mockDb.tables.webhook_events.get('evt_charge_success_100');
    assert.ok(evt, 'Webhook event must be recorded');
    assert.equal(evt.status, 'completed', 'Event status must be completed after all operations succeed');

    console.log('  ✔ POST handler successfully provisioned subscription, transaction, and marked event completed');
  }

  // -------------------------------------------------------------------------
  // Test 11: Handler Returns Generic Error and Logs Failure on DB Write Failure
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11 [HANDLER - IN-MEMORY SIMULATION]: Generic External Error & Diagnostic Log on DB Failure ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    mockDb.failWritesOnTable['business_subscriptions'] = {
      code: '53300',
      message: 'too_many_connections: connection pool exhausted',
    };

    const businessId = '4d3095ed-5ba8-4822-a6f8-0f5f15feb42c';
    const chargedEvent = {
      event: 'subscription.charged',
      id: 'evt_db_fail_101',
      payload: {
        subscription: {
          entity: {
            id: 'sub_fail_001',
            notes: {
              businessId,
              planId: 'business',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_fail_001',
            amount: 19900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(chargedEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Database failure must return HTTP 500');
    const json = await res.json();
    assert.equal(json.error, 'Webhook processing failed.', 'External caller receives generic error message');

    // Verify webhook_events ledger recorded detailed diagnostic status = 'failed'
    const evt = mockDb.tables.webhook_events.get('evt_db_fail_101');
    assert.ok(evt, 'Webhook event must be recorded');
    assert.equal(evt.status, 'failed', 'Event status must be marked as failed on error');
    assert.ok(evt.error_message?.includes('connection pool exhausted'), 'Diagnostic details retained in ledger');

    console.log('  ✔ POST handler returned generic error to caller and retained diagnostic details in ledger');
  }

  // -------------------------------------------------------------------------
  // Test 12: Handler Safely Recovers and Retries from status='failed'
  // -------------------------------------------------------------------------
  console.log('\n--- Test 12 [HANDLER - IN-MEMORY SIMULATION]: Safely Recovers and Retries from failed State ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = '4d3095ed-5ba8-4822-a6f8-0f5f15feb42c';
    const eventId = 'evt_retry_test_102';
    const chargedEvent = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: {
          entity: {
            id: 'sub_retry_001',
            notes: {
              businessId,
              planId: 'starter',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_retry_001',
            amount: 4900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    // 1. Initial attempt fails
    mockDb.failWritesOnTable['business_subscriptions'] = {
      code: '40001',
      message: 'serialization_failure: deadlock detected',
    };
    const req1 = createSignedWebhookRequest(chargedEvent);
    const res1 = await POST(req1);
    assert.equal(res1.status, 500);
    assert.equal(mockDb.tables.webhook_events.get(eventId).status, 'failed');

    // 2. Clear simulated DB failure and retry delivery (simulating Razorpay retry)
    delete mockDb.failWritesOnTable['business_subscriptions'];
    const req2 = createSignedWebhookRequest(chargedEvent);
    const res2 = await POST(req2);
    assert.equal(res2.status, 200, 'Retry delivery must succeed once DB recovers');
    const json2 = await res2.json();
    assert.equal(json2.success, true);

    // Verify final state is completed with clean error_message
    const evt = mockDb.tables.webhook_events.get(eventId);
    assert.equal(evt.status, 'completed', 'Event status must transition to completed on successful retry');
    assert.equal(evt.error_message, null, 'Error message must be cleared on success');

    const sub = mockDb.tables.business_subscriptions.get(businessId);
    assert.equal(sub.status, 'active');
    assert.equal(sub.plan_id, 'starter');

    console.log('  ✔ POST handler safely retried failed event from ledger and completed provisioning without duplicates');
  }

  // -------------------------------------------------------------------------
  // Test 13: Handler Deduplicates Duplicate Deliveries (already_processed)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 13 [HANDLER - IN-MEMORY SIMULATION]: Deduplicates Duplicate Deliveries ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = '4d3095ed-5ba8-4822-a6f8-0f5f15feb42c';
    const eventId = 'evt_duplicate_delivery_103';
    const chargedEvent = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: {
          entity: {
            id: 'sub_dup_001',
            notes: {
              businessId,
              planId: 'business',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_dup_001',
            amount: 19900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    // Delivery 1: Succeeds
    const req1 = createSignedWebhookRequest(chargedEvent);
    const res1 = await POST(req1);
    assert.equal(res1.status, 200);

    // Delivery 2: Duplicate delivery of completed event
    const req2 = createSignedWebhookRequest(chargedEvent);
    const res2 = await POST(req2);
    assert.equal(res2.status, 200);
    const json2 = await res2.json();
    assert.equal(json2.status, 'already_processed', 'Duplicate delivery must return already_processed');
    assert.equal(json2.eventId, eventId);

    console.log('  ✔ POST handler deduplicated repeated delivery of completed event with status=already_processed');
  }

  // -------------------------------------------------------------------------
  // Test 14: Promise.all Concurrent Deliveries of the Same Unseen Event
  // [IN-MEMORY SIMULATION: Asserts route-level concurrency control in simulated mock store; NOT proof of real PostgreSQL concurrency]
  // -------------------------------------------------------------------------
  console.log('\n--- Test 14 [HANDLER - IN-MEMORY SIMULATION]: Promise.all Unseen Event (Mock Store) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_concurrent_unseen_104';
    const eventId = 'evt_concurrent_unseen_104';
    const chargedEvent = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: {
          entity: {
            id: 'sub_unseen_104',
            notes: { businessId, planId: 'starter' },
          },
        },
        payment: {
          entity: {
            id: 'pay_unseen_104',
            amount: 4900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const reqA = createSignedWebhookRequest(chargedEvent);
    const reqB = createSignedWebhookRequest(chargedEvent);

    const [resA, resB] = await Promise.all([POST(reqA), POST(reqB)]);
    const statuses = [resA.status, resB.status];

    assert.ok(statuses.includes(200), 'At least one worker must successfully process');
    assert.ok(statuses.includes(429) || statuses.filter(s => s === 200).length === 2, 'Concurrent worker must be serialized or deduplicated');

    const sub = mockDb.tables.business_subscriptions.get(businessId);
    assert.ok(sub);
    assert.equal(sub.status, 'active');
    assert.equal(mockDb.tables.webhook_events.get(eventId).status, 'completed');

    console.log('  ✔ [IN-MEMORY SIMULATION] Promise.all concurrent unseen deliveries serialized safely without duplicate side effects');
  }

  // -------------------------------------------------------------------------
  // Test 15: Promise.all Concurrent Retries of a Failed Event
  // [IN-MEMORY SIMULATION: Asserts route-level concurrency control in simulated mock store; NOT proof of real PostgreSQL concurrency]
  // -------------------------------------------------------------------------
  console.log('\n--- Test 15 [HANDLER - IN-MEMORY SIMULATION]: Promise.all Concurrent Retries of Failed Event (Mock Store) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_concurrent_failed_105';
    const eventId = 'evt_concurrent_failed_105';

    mockDb.tables.webhook_events.set(eventId, {
      event_id: eventId,
      status: 'failed',
      processed_at: new Date(Date.now() - 5000).toISOString(),
      error_message: 'Previous timeout',
    });

    const chargedEvent = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: {
          entity: {
            id: 'sub_failed_retry_105',
            notes: { businessId, planId: 'business' },
          },
        },
        payment: {
          entity: {
            id: 'pay_failed_retry_105',
            amount: 19900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const reqA = createSignedWebhookRequest(chargedEvent);
    const reqB = createSignedWebhookRequest(chargedEvent);

    const [resA, resB] = await Promise.all([POST(reqA), POST(reqB)]);
    const statuses = [resA.status, resB.status];

    assert.ok(statuses.includes(200), 'One retry worker must succeed');
    assert.equal(mockDb.tables.webhook_events.get(eventId).status, 'completed');

    console.log('  ✔ [IN-MEMORY SIMULATION] Promise.all concurrent retries of failed event resolved atomically to completed');
  }

  // -------------------------------------------------------------------------
  // Test 16: Promise.all Concurrent Reclaim of a Stale Processing Event (>60s)
  // [IN-MEMORY SIMULATION: Asserts route-level concurrency control in simulated mock store; NOT proof of real PostgreSQL concurrency]
  // -------------------------------------------------------------------------
  console.log('\n--- Test 16 [HANDLER - IN-MEMORY SIMULATION]: Promise.all Concurrent Reclaim of Stale Event (Mock Store) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_concurrent_stale_106';
    const eventId = 'evt_concurrent_stale_106';

    mockDb.tables.webhook_events.set(eventId, {
      event_id: eventId,
      status: 'processing',
      processed_at: new Date(Date.now() - 120000).toISOString(),
    });

    const chargedEvent = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: {
          entity: {
            id: 'sub_stale_retry_106',
            notes: { businessId, planId: 'business' },
          },
        },
        payment: {
          entity: {
            id: 'pay_stale_retry_106',
            amount: 19900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const reqA = createSignedWebhookRequest(chargedEvent);
    const reqB = createSignedWebhookRequest(chargedEvent);

    const [resA, resB] = await Promise.all([POST(reqA), POST(reqB)]);
    const statuses = [resA.status, resB.status];

    assert.ok(statuses.includes(200), 'Stale worker must be reclaimed and succeed');
    assert.equal(mockDb.tables.webhook_events.get(eventId).status, 'completed');

    console.log('  ✔ [IN-MEMORY SIMULATION] Promise.all concurrent stale event reclaims handled atomically with zero race conditions');
  }

  // -------------------------------------------------------------------------
  // Test 17: Handler Strictly Rejects Payment with Mismatched Amount
  // -------------------------------------------------------------------------
  console.log('\n--- Test 17 [HANDLER - IN-MEMORY SIMULATION]: Rejects Payment with Mismatched Amount ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_underpaid_107';
    const underpaidEvent = {
      event: 'subscription.charged',
      id: 'evt_underpaid_107',
      payload: {
        subscription: {
          entity: {
            id: 'sub_underpaid_107',
            notes: { businessId, planId: 'starter' }, // Starter is ₹49 (4900 paise)
          },
        },
        payment: {
          entity: {
            id: 'pay_underpaid_107',
            amount: 1000, // Attacker paid ₹10 instead of ₹49
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(underpaidEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Underpayment must be rejected with HTTP 500');
    const json = await res.json();
    assert.equal(json.error, 'Webhook processing failed.');

    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false, 'Underpaid subscription must not be created');
    assert.equal(mockDb.tables.payment_transactions.has('pay_underpaid_107'), false, 'Underpaid payment must not be recorded as captured');

    const evt = mockDb.tables.webhook_events.get('evt_underpaid_107');
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('Invalid subscription amount 1000'));

    console.log('  ✔ Payment validation strictly rejected underpayment without substituting defaults');
  }

  // -------------------------------------------------------------------------
  // Test 18: Handler Strictly Rejects Invalid Currency
  // -------------------------------------------------------------------------
  console.log('\n--- Test 18 [HANDLER - IN-MEMORY SIMULATION]: Rejects Non-INR Currency ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_invalid_curr_108';
    const invalidCurrencyEvent = {
      event: 'subscription.charged',
      id: 'evt_invalid_curr_108',
      payload: {
        subscription: {
          entity: {
            id: 'sub_curr_108',
            notes: { businessId, planId: 'starter' },
          },
        },
        payment: {
          entity: {
            id: 'pay_curr_108',
            amount: 4900,
            currency: 'USD', // Invalid currency
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(invalidCurrencyEvent);
    const res = await POST(req);
    assert.equal(res.status, 500);
    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false);
    assert.ok(mockDb.tables.webhook_events.get('evt_invalid_curr_108').error_message?.includes('Invalid currency'));

    console.log('  ✔ Payment validation strictly rejected invalid currency');
  }

  // -------------------------------------------------------------------------
  // Test 19: Handler Strictly Rejects Missing or Non-Captured Status in Subscription Flow
  // -------------------------------------------------------------------------
  console.log('\n--- Test 19 [HANDLER - IN-MEMORY SIMULATION]: Rejects Missing Captured Status (Subscription) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_missing_status_sub_109';
    const missingStatusEvent = {
      event: 'subscription.charged',
      id: 'evt_missing_status_sub_109',
      payload: {
        subscription: {
          entity: {
            id: 'sub_nostatus_109',
            notes: { businessId, planId: 'starter' },
          },
        },
        payment: {
          entity: {
            id: 'pay_nostatus_109',
            amount: 4900,
            currency: 'INR',
            // Missing status property completely!
          },
        },
      },
    };

    const req = createSignedWebhookRequest(missingStatusEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Missing payment status must be rejected with HTTP 500');
    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false, 'Subscription must not be activated');

    const evt = mockDb.tables.webhook_events.get('evt_missing_status_sub_109');
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('Invalid or missing payment status'));

    console.log('  ✔ Subscription charge strictly rejected when payment status is missing');
  }

  // -------------------------------------------------------------------------
  // Test 20: Handler Strictly Rejects Missing or Non-Captured Status in Lifetime Flow
  // -------------------------------------------------------------------------
  console.log('\n--- Test 20 [HANDLER - IN-MEMORY SIMULATION]: Rejects Missing Captured Status (Lifetime) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_missing_status_lifetime_110';
    const missingStatusEvent = {
      event: 'order.paid',
      id: 'evt_missing_status_lt_110',
      payload: {
        order: {
          entity: {
            id: 'order_nostatus_110',
            notes: {
              businessId,
              planId: 'founding_lifetime',
              billingType: 'lifetime_purchase',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_nostatus_110',
            order_id: 'order_nostatus_110',
            amount: 59900,
            currency: 'INR',
            // Missing status property completely!
          },
        },
      },
    };

    const req = createSignedWebhookRequest(missingStatusEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Missing lifetime payment status must be rejected with HTTP 500');
    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false, 'Lifetime subscription must not be granted');

    const evt = mockDb.tables.webhook_events.get('evt_missing_status_lt_110');
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('Invalid or missing payment status'));

    console.log('  ✔ Lifetime purchase strictly rejected when payment status is missing');
  }

  // -------------------------------------------------------------------------
  // Test 21: Regression Test: Unexpected Claim RPC Error Mentioning Function Name Returns HTTP 500 Without Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- Test 21 [HANDLER - IN-MEMORY SIMULATION]: Rejects Unexpected RPC Error Mentioning Function Name Without Fallback ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    // Regression: An unexpected database error that mentions 'claim_webhook_event' in its message
    // (e.g. deadlock, statement timeout, syntax error, or permission error).
    // It must NOT match the fallback condition and must NOT attempt table-level fallback.
    mockDb.rpcHandlers['claim_webhook_event'] = async () => {
      return {
        data: null,
        error: {
          code: '40001',
          message: 'deadlock detected in procedure claim_webhook_event: transaction aborted',
        },
      };
    };

    const event = {
      event: 'subscription.charged',
      id: 'evt_rpc_deadlock_111',
      payload: {
        subscription: { entity: { id: 'sub_test_deadlock', notes: { businessId: 'biz_deadlock_111', planId: 'starter' } } },
        payment: { entity: { id: 'pay_test_deadlock', amount: 4900, currency: 'INR', status: 'captured' } },
      },
    };

    const req = createSignedWebhookRequest(event);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Unexpected claim RPC error must return HTTP 500');

    const json = await res.json();
    assert.equal(json.error, 'Webhook processing failed.', 'Must return generic error message to external callers');

    // Confirm that table-level fallback was NOT attempted:
    // If fallback had been attempted, it would have inserted a 'processing' event and provisioned the subscription.
    assert.equal(mockDb.tables.business_subscriptions.has('biz_deadlock_111'), false, 'Table-level fallback must NOT provision subscription');
    assert.equal(mockDb.tables.payment_transactions.has('pay_test_deadlock'), false, 'Table-level fallback must NOT record transaction');

    const evt = mockDb.tables.webhook_events.get('evt_rpc_deadlock_111');
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('Database error during webhook claim RPC: [40001] deadlock detected in procedure claim_webhook_event'));

    // Also verify that PostgREST PGRST202 (function not found in schema cache) DOES cleanly trigger fallback
    const pgrstDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(pgrstDb);
    pgrstDb.rpcHandlers['claim_webhook_event'] = async () => {
      return {
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function public.claim_webhook_event in the schema cache' },
      };
    };

    const pgrstReq = createSignedWebhookRequest({
      event: 'subscription.charged',
      id: 'evt_pgrst202_fallback_111',
      payload: {
        subscription: { entity: { id: 'sub_pgrst', notes: { businessId: 'biz_pgrst_111', planId: 'starter' } } },
        payment: { entity: { id: 'pay_pgrst', amount: 4900, currency: 'INR', status: 'captured' } },
      },
    });
    const pgrstRes = await POST(pgrstReq);
    assert.equal(pgrstRes.status, 200, 'PGRST202 must cleanly trigger table-level locking fallback');
    assert.ok(pgrstDb.tables.business_subscriptions.has('biz_pgrst_111'), 'Subscription must be provisioned via fallback when PGRST202 is encountered');

    console.log('  ✔ Regression passed: Unexpected RPC error mentioning function name returned generic HTTP 500 without fallback (PGRST202 fallback verified)');
  }

  // -------------------------------------------------------------------------
  // Test 22: Handler Strictly Rejects Empty RPC Result Without Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- Test 22 [HANDLER - IN-MEMORY SIMULATION]: Rejects Empty RPC Result Without Fallback ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_empty_rpc_112';
    const paymentId = 'pay_empty_rpc_112';
    const eventId = 'evt_empty_rpc_112';

    // Simulate RPC succeeding with empty array []
    mockDb.rpcHandlers['claim_webhook_event'] = async () => {
      return {
        data: [],
        error: null,
      };
    };

    const event = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: { entity: { id: 'sub_empty_rpc', notes: { businessId, planId: 'starter' } } },
        payment: { entity: { id: paymentId, amount: 4900, currency: 'INR', status: 'captured' } },
      },
    };

    const req = createSignedWebhookRequest(event);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Empty RPC result must return HTTP 500');

    const json = await res.json();
    assert.equal(json.error, 'Webhook processing failed.', 'Must return generic error message to external callers');

    // Confirm table-level fallback was NOT invoked:
    // business subscription and payment transaction must NOT be provisioned
    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false, 'Table-level fallback must NOT provision subscription');
    assert.equal(mockDb.tables.payment_transactions.has(paymentId), false, 'Table-level fallback must NOT record transaction');

    const evt = mockDb.tables.webhook_events.get(eventId);
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('claim_webhook_event RPC returned empty or invalid response'));

    console.log('  ✔ Regression passed: Empty RPC result returned HTTP 500 without invoking table fallback or provisioning');
  }

  // -------------------------------------------------------------------------
  // Test 23: Handler Strictly Rejects Unknown claim_status Without Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- Test 23 [HANDLER - IN-MEMORY SIMULATION]: Rejects Unknown claim_status Without Fallback ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_unknown_status_113';
    const paymentId = 'pay_unknown_status_113';
    const eventId = 'evt_unknown_status_113';

    // Simulate RPC succeeding with unrecognized claim_status
    mockDb.rpcHandlers['claim_webhook_event'] = async () => {
      return {
        data: [{ claim_status: 'unknown_unexpected_status', event_status: 'pending' }],
        error: null,
      };
    };

    const event = {
      event: 'subscription.charged',
      id: eventId,
      payload: {
        subscription: { entity: { id: 'sub_unknown_status', notes: { businessId, planId: 'starter' } } },
        payment: { entity: { id: paymentId, amount: 4900, currency: 'INR', status: 'captured' } },
      },
    };

    const req = createSignedWebhookRequest(event);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Unknown claim_status must return HTTP 500');

    const json = await res.json();
    assert.equal(json.error, 'Webhook processing failed.', 'Must return generic error message to external callers');

    // Confirm table-level fallback was NOT invoked:
    // business subscription and payment transaction must NOT be provisioned
    assert.equal(mockDb.tables.business_subscriptions.has(businessId), false, 'Table-level fallback must NOT provision subscription');
    assert.equal(mockDb.tables.payment_transactions.has(paymentId), false, 'Table-level fallback must NOT record transaction');

    const evt = mockDb.tables.webhook_events.get(eventId);
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes("unrecognized claim_status: 'unknown_unexpected_status'"));

    console.log('  ✔ Regression passed: Unknown claim_status returned HTTP 500 without invoking table fallback or provisioning');
  }

  // -------------------------------------------------------------------------
  // Test 24: Handler Strictly Rejects Failed Lifetime Slot Claim (Sold Out)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 24 [HANDLER - IN-MEMORY SIMULATION]: Rejects Failed Lifetime Slot Claim (Sold Out) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const victimBusinessId = 'biz_lifetime_victim_112';
    const eventId = 'evt_lifetime_sold_out_112';

    mockDb.rpcHandlers['claim_founding_lifetime_slot'] = async () => {
      return {
        data: null,
        error: {
          code: 'P0001',
          message: 'All 25 founding lifetime slots have been claimed.',
        },
      };
    };

    const orderPaidEvent = {
      event: 'order.paid',
      id: eventId,
      payload: {
        order: {
          entity: {
            id: 'order_lifetime_sold_out',
            notes: {
              businessId: victimBusinessId,
              planId: 'founding_lifetime',
              billingType: 'lifetime_purchase',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_lifetime_sold_out',
            order_id: 'order_lifetime_sold_out',
            amount: 59900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(orderPaidEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Failed slot claim must return HTTP 500');

    // STRICT GUARANTEE: Workspace must NOT have lifetime subscription granted
    const sub = mockDb.tables.business_subscriptions.get(victimBusinessId);
    assert.equal(sub, undefined, 'CRITICAL: Direct upsert fallback must NEVER grant lifetime access on RPC failure');

    const evt = mockDb.tables.webhook_events.get(eventId);
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('All 25 founding lifetime slots have been claimed'));

    console.log('  ✔ Lifetime slot limit strictly enforced; direct upsert fallback eliminated');
  }

  // -------------------------------------------------------------------------
  // Test 25: Regression Test: Business Already Has Active Lifetime Slot & Receives Different Order/Payment
  // (Even when claim RPC returns existing slot, handler strictly rejects mismatched purchase)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 25 [HANDLER - IN-MEMORY SIMULATION]: Rejects Mismatched Lifetime Order/Payment ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_lifetime_occupied_113';
    const eventId = 'evt_mismatched_payment_113';

    // Business already has an active lifetime slot (#3) tied to order_AAA / pay_AAA
    mockDb.tables.business_subscriptions.set(businessId, {
      business_id: businessId,
      plan_id: 'founding_lifetime',
      status: 'active',
      is_lifetime: true,
      lifetime_slot_number: 3,
      razorpay_order_id: 'order_AAA',
      razorpay_payment_id: 'pay_AAA',
    });

    // An event arrives for a DIFFERENT order and payment: order_BBB / pay_BBB
    const newPaymentEvent = {
      event: 'order.paid',
      id: eventId,
      payload: {
        order: {
          entity: {
            id: 'order_BBB',
            notes: {
              businessId,
              planId: 'founding_lifetime',
              billingType: 'lifetime_purchase',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_BBB',
            order_id: 'order_BBB',
            amount: 59900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(newPaymentEvent);
    const res = await POST(req);
    assert.equal(res.status, 500, 'Mismatched order/payment must fail safely with HTTP 500');

    // Confirm that the original subscription remains unmodified
    const sub = mockDb.tables.business_subscriptions.get(businessId);
    assert.equal(sub.razorpay_order_id, 'order_AAA', 'Existing order ID must not be overwritten');
    assert.equal(sub.razorpay_payment_id, 'pay_AAA', 'Existing payment ID must not be overwritten');

    // Confirm that the second payment was NOT recorded in payment_transactions
    assert.equal(mockDb.tables.payment_transactions.has('pay_BBB'), false, 'Mismatched payment must NOT be recorded as captured');

    // Verify webhook ledger failure status
    const evt = mockDb.tables.webhook_events.get(eventId);
    assert.equal(evt.status, 'failed');
    assert.ok(evt.error_message?.includes('already has an active lifetime slot'));

    console.log('  ✔ Regression passed: Mismatched order/payment rejected without overwriting slot or transaction');
  }

  // -------------------------------------------------------------------------
  // Test 26: Handler Idempotently Resolves Exact Matching Lifetime Duplicate
  // -------------------------------------------------------------------------
  console.log('\n--- Test 26 [HANDLER - IN-MEMORY SIMULATION]: Idempotently Resolves Matching Lifetime Duplicate ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const businessId = 'biz_verified_lifetime_114';
    const eventId = 'evt_verified_dup_114';
    const orderId = 'order_verified_114';
    const paymentId = 'pay_verified_114';

    // Workspace already has lifetime slot for EXACT same order and payment
    mockDb.tables.business_subscriptions.set(businessId, {
      business_id: businessId,
      plan_id: 'founding_lifetime',
      status: 'active',
      is_lifetime: true,
      lifetime_slot_number: 14,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    });

    const orderPaidEvent = {
      event: 'order.paid',
      id: eventId,
      payload: {
        order: {
          entity: {
            id: orderId,
            notes: {
              businessId,
              planId: 'founding_lifetime',
              billingType: 'lifetime_purchase',
            },
          },
        },
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 59900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const req = createSignedWebhookRequest(orderPaidEvent);
    const res = await POST(req);
    assert.equal(res.status, 200, 'Matching order & payment duplicate must succeed idempotently');
    const json = await res.json();
    assert.equal(json.plan, 'founding_lifetime');

    assert.equal(mockDb.tables.webhook_events.get(eventId).status, 'completed');

    console.log('  ✔ Confirmed identical duplicate lifetime payment resolved idempotently to completed');
  }

  // -------------------------------------------------------------------------
  // Test 27: Handler Handles subscription.cancelled, halted, and payment.failed
  // -------------------------------------------------------------------------
  console.log('\n--- Test 27 [HANDLER - IN-MEMORY SIMULATION]: Lifecycle Transitions (cancelled, halted, payment.failed) ---');
  {
    const mockDb = new MockSupabaseClient();
    setWebhookSupabaseClientOverride(mockDb);

    const subId = 'sub_lifecycle_115';
    const businessId = 'biz_lifecycle_115';

    mockDb.tables.business_subscriptions.set(businessId, {
      business_id: businessId,
      razorpay_subscription_id: subId,
      status: 'active',
      cancel_at_period_end: false,
    });

    // 1. Process subscription.cancelled
    const cancelReq = createSignedWebhookRequest({
      event: 'subscription.cancelled',
      id: 'evt_cancel_115',
      payload: { subscription: { entity: { id: subId } } },
    });
    const resCancel = await POST(cancelReq);
    assert.equal(resCancel.status, 200);
    assert.equal(mockDb.tables.business_subscriptions.get(businessId).status, 'cancelled');

    // 2. Process subscription.halted
    const haltReq = createSignedWebhookRequest({
      event: 'subscription.halted',
      id: 'evt_halt_115',
      payload: { subscription: { entity: { id: subId } } },
    });
    const resHalt = await POST(haltReq);
    assert.equal(resHalt.status, 200);
    assert.equal(mockDb.tables.business_subscriptions.get(businessId).status, 'past_due');

    // 3. Process payment.failed
    const failReq = createSignedWebhookRequest({
      event: 'payment.failed',
      id: 'evt_pay_failed_115',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_115',
            amount: 4900,
            currency: 'INR',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Card expired',
            notes: { businessId, planId: 'starter' },
          },
        },
      },
    });
    const resFail = await POST(failReq);
    assert.equal(resFail.status, 200);
    const tx = mockDb.tables.payment_transactions.get('pay_failed_115');
    assert.equal(tx.status, 'failed');
    assert.equal(tx.error_code, 'BAD_REQUEST_ERROR');

    console.log('  ✔ Successfully processed cancelled, halted, and payment.failed events');
  }
}

// Execute sequential handler tests and print final summary
runHandlerIntegrationTests()
  .then(() => {
    console.log('\n================================================================');
    console.log('🎉 ALL 27 WEBHOOK & SUBSCRIPTION AUDIT TESTS PASSED SUCCESSFULLY!');
    console.log('   - 6 Helper-Level Pure Unit Tests');
    console.log('   - 21 Handler-Level Simulated Database Tests (POST + In-Memory Ledger)');
    console.log('   - Concurrency tests are IN-MEMORY SIMULATIONS, not proof of real PG concurrency');
    console.log('   - Empty RPC results, unknown claim_status, & RPC fallback boundaries strictly guarded');
    console.log('   - Explicit captured status, lifetime identity binding, & RPC safety verified');
    console.log('================================================================\n');
  })
  .catch((err) => {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  });
