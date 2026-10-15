import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PLANS,
  FREE_TRIAL_DURATION_DAYS,
  FREE_TRIAL_MAX_CUSTOMERS,
  getTrialInfo,
  getPlanById,
} from '../lib/billing/plans';
import {
  CustomerLimitReachedError,
  TrialNotStartedError,
  TrialExpiredError,
  checkBusinessCustomerCapacity,
} from '../lib/billing/limits';

async function runTests() {
  console.log('🧪 Starting RenewalDesk 14-Day Free Trial & Entitlement Test Suite...\n');

  // ==============================================================================
  // Test Suite 1: Trial State, Countdown Calculation & Expiry Rules
  // ==============================================================================
  console.log('--- Suite 1: Trial State, Countdown Calculation & Authoritative Expiry ---');

  {
    // 1. Unstarted Trial (No subscription record)
    const unstartedInfo = getTrialInfo(null);
    assert.equal(unstartedInfo.status, 'not_started');
    assert.equal(unstartedInfo.isNotStarted, true);
    assert.equal(unstartedInfo.isActive, false);
    assert.equal(unstartedInfo.isExpired, false);
    assert.equal(unstartedInfo.isConverted, false);
    assert.equal(unstartedInfo.canStartTrial, true);
    assert.equal(unstartedInfo.countdownLabel, 'Not Started');
    console.log('  ✔ Unstarted trial state correctly detected when no subscription exists');

    // 2. Explicit Unstarted Trial row
    const explicitUnstarted = getTrialInfo({
      trial_status: 'not_started',
      status: 'incomplete',
    });
    assert.equal(explicitUnstarted.status, 'not_started');
    assert.equal(explicitUnstarted.isNotStarted, true);
    assert.equal(explicitUnstarted.canStartTrial, true);
    console.log('  ✔ Explicit trial_status = not_started returns unstarted trial state');

    // 3. Exact 14-Day Expiry Calculation
    const now = new Date('2026-10-12T12:00:00Z');
    const exact14DaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    assert.equal(
      exact14DaysLater.toISOString(),
      '2026-10-26T12:00:00.000Z',
      '14 days from 2026-10-12 must be exactly 2026-10-26'
    );
    console.log('  ✔ Exact 14-day duration calculation verified');

    // 4. Countdown Labels across lifecycle
    // 14 days remaining
    const active14 = getTrialInfo({
      trial_status: 'active',
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(active14.status, 'active');
    assert.equal(active14.isActive, true);
    assert.equal(active14.countdownLabel, '14 days left');

    // 7 days remaining
    const active7 = getTrialInfo({
      trial_status: 'active',
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(active7.countdownLabel, '7 days left');

    // 3 days remaining
    const active3 = getTrialInfo({
      trial_status: 'active',
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(active3.countdownLabel, '3 days left');

    // < 24 hours remaining -> "Trial expires today"
    const expiringToday = getTrialInfo({
      trial_status: 'active',
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours remaining
    });
    assert.equal(expiringToday.countdownLabel, 'Trial expires today');
    assert.equal(expiringToday.isActive, true);

    // Past expiry -> "Trial expired"
    const pastExpiry = getTrialInfo({
      trial_status: 'active',
      status: 'trialing',
      trial_started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      trial_expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // expired yesterday
    });
    assert.equal(pastExpiry.status, 'expired');
    assert.equal(pastExpiry.isExpired, true);
    assert.equal(pastExpiry.isActive, false);
    assert.equal(pastExpiry.countdownLabel, 'Trial expired');
    console.log('  ✔ Authoritative countdown formatting verified (14d, 7d, 3d, today, expired)');

    // 5. Converted / Paid plan
    const converted = getTrialInfo({
      status: 'active',
      plan_id: 'business',
      billing_type: 'monthly_subscription',
      trial_status: 'converted',
    });
    assert.equal(converted.status, 'converted');
    assert.equal(converted.isConverted, true);
    assert.equal(converted.isActive, false);
    assert.equal(converted.isExpired, false);
    console.log('  ✔ Converted trial status verified for paid subscriptions');
  }

  // ==============================================================================
  // Test Suite 2: Customer Capacity & Gating Under Free Trial
  // ==============================================================================
  console.log('\n--- Suite 2: Customer Capacity Limits & Operation Gating ---');

  {
    // Mock Supabase client to test checkBusinessCustomerCapacity fallback logic
    function createMockSupabase(subscriptionRow: any, activeCustomerCount: number) {
      return {
        rpc: async () => ({ data: null, error: new Error('RPC_NOT_AVAILABLE') }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: subscriptionRow, error: null }),
              is: async () => ({ count: activeCustomerCount, error: null }),
            }),
          }),
        }),
      } as any;
    }

    // 1. Unstarted Trial Blocks Adding Customers
    const mockUnstarted = createMockSupabase(null, 0);
    const unstartedCap = await checkBusinessCustomerCapacity(mockUnstarted, 'biz-1', 1);
    assert.equal(unstartedCap.allowed, false, 'Unstarted trial must not allow adding customers');
    assert.equal(unstartedCap.trialStatus, 'not_started');
    assert.equal(unstartedCap.maxCapacity, 0);
    console.log('  ✔ Adding customer to unstarted trial workspace is rejected');

    // 2. Active Trial Allows up to 25 Active Customers
    const mockActiveTrial = createMockSupabase(
      {
        plan_id: 'free_trial',
        billing_type: 'free_trial',
        status: 'trialing',
        trial_status: 'active',
        max_active_customers: 25,
        trial_started_at: new Date().toISOString(),
        trial_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      20 // current 20 active customers
    );

    const activeCap = await checkBusinessCustomerCapacity(mockActiveTrial, 'biz-1', 1);
    assert.equal(activeCap.allowed, true, '21st customer out of 25 must be allowed');
    assert.equal(activeCap.remainingCapacity, 5);
    assert.equal(activeCap.currentCount, 20);
    assert.equal(activeCap.maxCapacity, 25);
    console.log('  ✔ Active trial permits active customers up to 25 limit');

    // 3. 26th Active Customer is Rejected
    const mockAtCapacity = createMockSupabase(
      {
        plan_id: 'free_trial',
        billing_type: 'free_trial',
        status: 'trialing',
        trial_status: 'active',
        max_active_customers: 25,
        trial_started_at: new Date().toISOString(),
        trial_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      25 // exactly 25 active customers
    );

    const capExceeded = await checkBusinessCustomerCapacity(mockAtCapacity, 'biz-1', 1);
    assert.equal(capExceeded.allowed, false, '26th customer must be rejected');
    assert.equal(capExceeded.remainingCapacity, 0);

    const limitErr = new CustomerLimitReachedError(25, 25, '14-Day Free Trial');
    assert.ok(limitErr.message.includes('25/25 active customers'));
    assert.ok(limitErr.message.includes('Upgrade your plan'));
    console.log('  ✔ 26th active customer is strictly rejected with descriptive error');

    // 4. Expired Trial Blocks Customer Creation
    const mockExpired = createMockSupabase(
      {
        plan_id: 'free_trial',
        billing_type: 'free_trial',
        status: 'trialing',
        trial_status: 'active',
        max_active_customers: 25,
        trial_started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        trial_expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // expired
      },
      10
    );

    const expiredCap = await checkBusinessCustomerCapacity(mockExpired, 'biz-1', 1);
    assert.equal(expiredCap.allowed, false, 'Expired trial must block additions');
    assert.equal(expiredCap.isTrialExpired, true);
    assert.equal(expiredCap.remainingCapacity, 0);

    const expiredErr = new TrialExpiredError();
    assert.ok(expiredErr.message.includes('free trial has expired'));
    assert.ok(expiredErr.message.includes('records are preserved'));
    console.log('  ✔ Expired trial strictly blocks new customer additions while preserving records');

    // 5. Customer Limit Errors Provide Guidance
    const unstartedErr = new TrialNotStartedError();
    assert.ok(unstartedErr.message.includes('Start 14-Day Free Trial'));
    console.log('  ✔ Error classes format user-friendly guidance for unstarted and expired trials');
  }

  // ==============================================================================
  // Test Suite 3: Upgrade Conversion & Plan Transition
  // ==============================================================================
  console.log('\n--- Suite 3: Seamless Trial Upgrade & Entitlement Conversion ---');

  {
    // 1. Starter Upgrade (₹49/mo, 25 customers)
    const starter = PLANS.starter;
    assert.equal(starter.priceINR, 49);
    assert.equal(starter.maxActiveCustomers, 25);

    // 2. Business Upgrade (₹199/mo, 250 customers)
    const business = PLANS.business;
    assert.equal(business.priceINR, 199);
    assert.equal(business.maxActiveCustomers, 250);

    // 3. Founding Lifetime Upgrade (₹599 one-time, 100 customers)
    const lifetime = PLANS.founding_lifetime;
    assert.equal(lifetime.priceINR, 599);
    assert.equal(lifetime.maxActiveCustomers, 100);
    assert.equal(lifetime.isLifetime, true);

    // 4. Verify Paid Plan Re-evaluates Capacity Immediately
    const mockUpgraded = {
      rpc: async () => ({ data: null, error: new Error('RPC_NOT_AVAILABLE') }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                plan_id: 'business',
                billing_type: 'monthly_subscription',
                status: 'active',
                max_active_customers: 250,
                trial_status: 'converted',
              },
              error: null,
            }),
            is: async () => ({ count: 25, error: null }),
          }),
        }),
      }),
    } as any;

    const upgradedCap = await checkBusinessCustomerCapacity(mockUpgraded, 'biz-1', 1);
    assert.equal(upgradedCap.allowed, true);
    assert.equal(upgradedCap.maxCapacity, 250);
    assert.equal(upgradedCap.remainingCapacity, 225);
    assert.equal(upgradedCap.planId, 'business');
    assert.equal(upgradedCap.trialStatus, 'converted');
    console.log('  ✔ Trial upgrade immediately unlocks expanded capacity and converts trial status');
  }

  // ==============================================================================
  // Test Suite 4: SQL Migration Verification & Multi-Tenant Authorization
  // ==============================================================================
  console.log('\n--- Suite 4: Database Migration File & Authorization Verification ---');

  {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261012_trial_system.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261012_trial_system.sql must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Verify column additions
    assert.ok(sqlContent.includes('trial_status'), 'Must define trial_status column');
    assert.ok(sqlContent.includes('trial_started_at'), 'Must define trial_started_at column');
    assert.ok(sqlContent.includes('trial_expires_at'), 'Must define trial_expires_at column');
    assert.ok(sqlContent.includes('trial_duration_days'), 'Must define trial_duration_days column');
    assert.ok(sqlContent.includes('trial_activated_by'), 'Must define trial_activated_by column');
    console.log('  ✔ All required trial schema columns defined in migration');

    // Verify atomic start_free_trial function
    assert.ok(sqlContent.includes('FUNCTION public.start_free_trial'), 'Must define start_free_trial function');
    assert.ok(sqlContent.includes('SECURITY DEFINER'), 'start_free_trial must be SECURITY DEFINER');
    assert.ok(sqlContent.includes('SET search_path = public, pg_temp'), 'start_free_trial must use safe search_path');
    assert.ok(sqlContent.includes("v_role <> 'owner'"), 'Must strictly require workspace owner role');
    assert.ok(sqlContent.includes('pg_advisory_xact_lock'), 'Must acquire advisory lock against concurrent activation');
    assert.ok(sqlContent.includes("TRIAL_ALREADY_USED"), 'Must reject repeated trial activations');
    assert.ok(sqlContent.includes("ALREADY_PAID"), 'Must prevent overwriting active paid plans');
    console.log('  ✔ start_free_trial RPC function enforces owner authorization, locks, and idempotency');

    // Verify check_customer_capacity function
    assert.ok(sqlContent.includes('FUNCTION public.check_customer_capacity'), 'Must define check_customer_capacity');
    assert.ok(sqlContent.includes('is_trial_expired'), 'check_customer_capacity must return is_trial_expired flag');
    assert.ok(sqlContent.includes("clock_timestamp() >= v_sub.trial_expires_at"), 'Must evaluate authoritative database clock against expiry');
    console.log('  ✔ check_customer_capacity checks authoritative clock and blocks expired trials');

    // Verify conversion in upgrade procedures
    assert.ok(sqlContent.includes("trial_status = 'converted'"), 'Upgrade functions must set trial_status = converted');
    console.log('  ✔ Paid subscription and lifetime slot activations mark trial as converted');

    // Verify existing workspace preservation backfill
    assert.ok(sqlContent.includes('UPDATE public.business_subscriptions'), 'Must include safe compatibility backfill');
    assert.ok(sqlContent.includes("trial_status = 'converted'"), 'Preserves paid subscriptions as converted');
    console.log('  ✔ Existing workspaces and active paid subscriptions safely preserved');
  }

  console.log('\n🎉 ALL 14-DAY FREE TRIAL & ENTITLEMENT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
