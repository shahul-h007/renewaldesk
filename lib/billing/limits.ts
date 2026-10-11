import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanById, PLANS, DEFAULT_TRIAL_CUSTOMER_LIMIT } from './plans';

export class CustomerLimitReachedError extends Error {
  public currentCount: number;
  public maxCapacity: number;
  public planName: string;

  constructor(currentCount: number, maxCapacity: number, planName: string) {
    super(
      `Plan capacity reached: ${currentCount}/${maxCapacity} active customers in the ${planName} plan. Upgrade your plan to add more customers.`
    );
    this.name = 'CustomerLimitReachedError';
    this.currentCount = currentCount;
    this.maxCapacity = maxCapacity;
    this.planName = planName;
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
}

/**
 * Check customer capacity against the business's active subscription limit.
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
      const plan = getPlanById(res.plan_id) || PLANS.starter;
      return {
        allowed: Boolean(res.allowed),
        currentCount: Number(res.current_active_count),
        maxCapacity: Number(res.max_capacity),
        remainingCapacity: Number(res.remaining_capacity),
        planId: res.plan_id,
        planName: plan.name,
        isLifetime: Boolean(res.is_lifetime),
      };
    }
  } catch {
    // Fall back to direct query if RPC is not yet created in remote database
  }

  // 2. Query subscription table
  let maxCapacity = DEFAULT_TRIAL_CUSTOMER_LIMIT;
  let planId = 'starter';
  let planName = PLANS.starter.name;
  let isLifetime = false;

  try {
    const { data: sub } = await supabase
      .from('business_subscriptions')
      .select('plan_id, max_active_customers, is_lifetime, status')
      .eq('business_id', businessId)
      .maybeSingle();

    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      maxCapacity = sub.max_active_customers || DEFAULT_TRIAL_CUSTOMER_LIMIT;
      planId = sub.plan_id;
      const plan = getPlanById(planId);
      planName = plan ? plan.name : 'Custom Plan';
      isLifetime = Boolean(sub.is_lifetime);
    }
  } catch {
    // Subscription table may not exist yet, default to trial limit
  }

  // 3. Count non-archived customers
  const { count: activeCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .is('archived_at', null);

  const currentCount = activeCount ?? 0;
  const remainingCapacity = Math.max(0, maxCapacity - currentCount);
  const allowed = currentCount + incomingCount <= maxCapacity;

  return {
    allowed,
    currentCount,
    maxCapacity,
    remainingCapacity,
    planId,
    planName,
    isLifetime,
  };
}
