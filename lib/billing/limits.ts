import { SupabaseClient } from '@supabase/supabase-js';
import {
  getPlanById,
  PLANS,
  TrialStatus,
  FREE_TRIAL_MAX_CUSTOMERS,
} from './plans';

export class CustomerLimitReachedError extends Error {
  public currentCount: number;
  public maxCapacity: number;
  public planName: string;

  constructor(currentCount: number, maxCapacity: number, planName: string) {
    super(
      `Plan capacity reached: ${currentCount}/${maxCapacity} active customers in the ${planName} plan. Upgrade your plan to add more customers or archive inactive customer records.`
    );
    this.name = 'CustomerLimitReachedError';
    this.currentCount = currentCount;
    this.maxCapacity = maxCapacity;
    this.planName = planName;
  }
}

export class TrialNotStartedError extends Error {
  constructor() {
    super(
      'Free trial has not been activated for this workspace. Click "Start 14-Day Free Trial" to begin adding customers.'
    );
    this.name = 'TrialNotStartedError';
  }
}

export class TrialExpiredError extends Error {
  constructor() {
    super(
      'Your 14-day free trial has expired. Your existing customer and service records are preserved, but adding new customers is paused. Upgrade to a paid plan to continue.'
    );
    this.name = 'TrialExpiredError';
  }
}

export interface CapacityCheckResult {
  allowed: boolean;
  currentCount: number;
  maxCapacity: number;
  remainingCapacity: number;
  planId: string;
  planName: string;
  isLifetime: boolean;
  trialStatus: TrialStatus;
  isTrialExpired: boolean;
  trialExpiresAt: string | null;
}

/**
 * Check customer capacity against the business's active subscription limit and trial state.
 */
export async function checkBusinessCustomerCapacity(
  supabase: SupabaseClient,
  businessId: string,
  incomingCount: number = 1
): Promise<CapacityCheckResult> {
  // 1. Try atomic database RPC function first if available
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('check_customer_capacity', {
      p_business_id: businessId,
      p_incoming_count: incomingCount,
    });

    if (!rpcErr && rpcData && rpcData.length > 0) {
      const res = rpcData[0];
      const plan = getPlanById(res.plan_id);
      let planName = plan ? plan.name : res.plan_id;
      if (res.plan_id === 'free_trial') {
        planName = res.is_trial_expired ? 'Free Trial (Expired)' : '14-Day Free Trial';
      } else if (res.plan_id === 'not_started') {
        planName = 'Trial Not Started';
      }

      return {
        allowed: Boolean(res.allowed),
        currentCount: Number(res.current_active_count),
        maxCapacity: Number(res.max_capacity),
        remainingCapacity: Number(res.remaining_capacity),
        planId: res.plan_id,
        planName,
        isLifetime: Boolean(res.is_lifetime),
        trialStatus: (res.trial_status as TrialStatus) || (res.is_trial_expired ? 'expired' : 'active'),
        isTrialExpired: Boolean(res.is_trial_expired),
        trialExpiresAt: res.trial_expires_at || null,
      };
    }
  } catch {
    // Fall back to direct query if RPC is not yet created in remote database
  }

  // 2. Query subscription table directly
  let sub: any = null;
  try {
    const { data: subData } = await supabase
      .from('business_subscriptions')
      .select('plan_id, max_active_customers, is_lifetime, status, trial_status, trial_started_at, trial_expires_at, billing_type')
      .eq('business_id', businessId)
      .maybeSingle();
    sub = subData;
  } catch {
    // Subscription table may not exist yet
  }

  // 3. Count non-archived customers
  const { count: activeCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .is('archived_at', null);

  const currentCount = activeCount ?? 0;

  // 4. Resolve entitlement and trial status
  let allowed = false;
  let maxCapacity = 0;
  let remainingCapacity = 0;
  let planId = 'not_started';
  let planName = 'Trial Not Started';
  let isLifetime = false;
  let trialStatus: TrialStatus = 'not_started';
  let isTrialExpired = false;
  let trialExpiresAt: string | null = null;

  if (!sub) {
    // No subscription record: trial not started
    trialStatus = 'not_started';
    maxCapacity = 0;
    remainingCapacity = 0;
    allowed = false;
    planId = 'not_started';
    planName = 'Trial Not Started';
  } else if (
    sub.status === 'active' &&
    (sub.is_lifetime || sub.billing_type === 'monthly_subscription' || sub.billing_type === 'lifetime_purchase')
  ) {
    // Active paid or lifetime plan
    maxCapacity = sub.max_active_customers || 25;
    planId = sub.plan_id;
    const plan = getPlanById(planId);
    planName = plan ? plan.name : 'Paid Plan';
    isLifetime = Boolean(sub.is_lifetime);
    trialStatus = 'converted';
    isTrialExpired = false;
    remainingCapacity = Math.max(0, maxCapacity - currentCount);
    allowed = currentCount + incomingCount <= maxCapacity;
    trialExpiresAt = sub.trial_expires_at || null;
  } else if (sub.trial_status === 'not_started') {
    // Explicitly unstarted trial
    trialStatus = 'not_started';
    maxCapacity = 0;
    remainingCapacity = 0;
    allowed = false;
    planId = 'not_started';
    planName = 'Trial Not Started';
  } else if (sub.trial_status === 'expired' || sub.status === 'expired') {
    // Explicitly expired trial
    trialStatus = 'expired';
    isTrialExpired = true;
    maxCapacity = FREE_TRIAL_MAX_CUSTOMERS;
    remainingCapacity = 0;
    allowed = false;
    planId = 'free_trial';
    planName = 'Free Trial (Expired)';
    trialExpiresAt = sub.trial_expires_at || null;
  } else if (sub.trial_status === 'active' || (sub.billing_type === 'free_trial' && sub.status === 'trialing')) {
    // Active trial: check expiry timestamp
    trialExpiresAt = sub.trial_expires_at || null;
    const isPastDue = trialExpiresAt ? new Date().getTime() >= new Date(trialExpiresAt).getTime() : false;

    if (isPastDue) {
      trialStatus = 'expired';
      isTrialExpired = true;
      maxCapacity = FREE_TRIAL_MAX_CUSTOMERS;
      remainingCapacity = 0;
      allowed = false;
      planId = 'free_trial';
      planName = 'Free Trial (Expired)';
    } else {
      trialStatus = 'active';
      isTrialExpired = false;
      maxCapacity = sub.max_active_customers || FREE_TRIAL_MAX_CUSTOMERS;
      remainingCapacity = Math.max(0, maxCapacity - currentCount);
      allowed = currentCount + incomingCount <= maxCapacity;
      planId = 'free_trial';
      planName = '14-Day Free Trial';
    }
  } else {
    // Other states (cancelled, past_due)
    maxCapacity = sub.max_active_customers || 25;
    planId = sub.plan_id;
    planName = 'Suspended Plan';
    allowed = false;
    remainingCapacity = 0;
    trialStatus = 'converted';
  }

  return {
    allowed,
    currentCount,
    maxCapacity,
    remainingCapacity,
    planId,
    planName,
    isLifetime,
    trialStatus,
    isTrialExpired,
    trialExpiresAt,
  };
}
