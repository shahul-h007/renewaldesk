export type BillingPlanId =
  | 'starter'
  | 'business'
  | 'business_growth'
  | 'business_scale'
  | 'large_business'
  | 'founding_lifetime';

export type BillingInterval = 'monthly' | 'one_time';
export type BillingType = 'monthly_subscription' | 'lifetime_purchase' | 'free_trial';

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  tagline: string;
  priceINR: number;
  pricePaise: number;
  interval: BillingInterval;
  billingType: BillingType;
  maxActiveCustomers: number;
  isRecommended?: boolean;
  isLifetime?: boolean;
  maxLifetimeSlots?: number;
  planIdEnvKey?: string;
  description: string;
}

export const FOUNDING_LIFETIME_MAX_SLOTS = 25;
export const DEFAULT_TRIAL_CUSTOMER_LIMIT = 25;
export const FREE_TRIAL_DURATION_DAYS = 14;
export const FREE_TRIAL_MAX_CUSTOMERS = 25;

export type TrialStatus = 'not_started' | 'active' | 'expired' | 'converted';

export interface TrialInfo {
  status: TrialStatus;
  isActive: boolean;
  isExpired: boolean;
  isConverted: boolean;
  isNotStarted: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number;
  hoursRemaining: number;
  countdownLabel: string;
  canStartTrial: boolean;
}

export const PLANS: Record<BillingPlanId, BillingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For independent service technicians & new solo operations',
    priceINR: 49,
    pricePaise: 4900,
    interval: 'monthly',
    billingType: 'monthly_subscription',
    maxActiveCustomers: 25,
    planIdEnvKey: 'RAZORPAY_PLAN_STARTER_ID',
    description: 'Up to 25 active customers with core renewal tracking and WhatsApp follow-ups.',
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Recommended for growing local service & repair businesses',
    priceINR: 199,
    pricePaise: 19900,
    interval: 'monthly',
    billingType: 'monthly_subscription',
    maxActiveCustomers: 250,
    isRecommended: true,
    planIdEnvKey: 'RAZORPAY_PLAN_BUSINESS_ID',
    description: 'Up to 250 active customers with full service cycle automation and CSV imports.',
  },
  business_growth: {
    id: 'business_growth',
    name: 'Business Growth',
    tagline: 'For established multi-technician service workshops',
    priceINR: 249,
    pricePaise: 24900,
    interval: 'monthly',
    billingType: 'monthly_subscription',
    maxActiveCustomers: 500,
    planIdEnvKey: 'RAZORPAY_PLAN_BUSINESS_GROWTH_ID',
    description: 'Up to 500 active customers with high-volume follow-up queue management.',
  },
  business_scale: {
    id: 'business_scale',
    name: 'Business Scale',
    tagline: 'For regional service centers managing large customer fleets',
    priceINR: 299,
    pricePaise: 29900,
    interval: 'monthly',
    billingType: 'monthly_subscription',
    maxActiveCustomers: 1000,
    planIdEnvKey: 'RAZORPAY_PLAN_BUSINESS_SCALE_ID',
    description: 'Up to 1,000 active customers with complete recurrence management.',
  },
  large_business: {
    id: 'large_business',
    name: 'Large Business',
    tagline: 'For high-volume service franchises & commercial operations',
    priceINR: 399,
    pricePaise: 39900,
    interval: 'monthly',
    billingType: 'monthly_subscription',
    maxActiveCustomers: 2000,
    planIdEnvKey: 'RAZORPAY_PLAN_LARGE_BUSINESS_ID',
    description: 'Up to 2,000 active customers with dedicated capacity for extensive operations.',
  },
  founding_lifetime: {
    id: 'founding_lifetime',
    name: 'Founding Lifetime',
    tagline: 'Exclusive launch offer — Pay once, use RenewalDesk without recurring fees',
    priceINR: 599,
    pricePaise: 59900,
    interval: 'one_time',
    billingType: 'lifetime_purchase',
    maxActiveCustomers: 100,
    isLifetime: true,
    maxLifetimeSlots: FOUNDING_LIFETIME_MAX_SLOTS,
    description: 'One-time payment for 100 active customers. No recurring RenewalDesk fees while the service operates. Strictly limited to the first 25 successful purchases.',
  },
};

export const PLANS_LIST: BillingPlan[] = [
  PLANS.starter,
  PLANS.business,
  PLANS.business_growth,
  PLANS.business_scale,
  PLANS.large_business,
  PLANS.founding_lifetime,
];

export function getPlanById(id: string): BillingPlan | undefined {
  if (id in PLANS) {
    return PLANS[id as BillingPlanId];
  }
  return undefined;
}

export function getActiveCustomerLimit(planId: string | null | undefined): number {
  if (!planId) return DEFAULT_TRIAL_CUSTOMER_LIMIT;
  const plan = getPlanById(planId);
  return plan ? plan.maxActiveCustomers : DEFAULT_TRIAL_CUSTOMER_LIMIT;
}

export function getPlanEnvKey(planId: BillingPlanId): string | null {
  return PLANS[planId]?.planIdEnvKey || null;
}

export function getTrialInfo(sub: {
  trial_status?: string | null;
  trial_started_at?: string | null;
  trial_expires_at?: string | null;
  status?: string | null;
  is_lifetime?: boolean | null;
  billing_type?: string | null;
} | null): TrialInfo {
  // If workspace has an active paid plan or lifetime purchase, it is converted
  if (
    sub &&
    sub.status === 'active' &&
    (sub.is_lifetime ||
      sub.billing_type === 'monthly_subscription' ||
      sub.billing_type === 'lifetime_purchase')
  ) {
    return {
      status: 'converted',
      isActive: false,
      isExpired: false,
      isConverted: true,
      isNotStarted: false,
      startedAt: sub.trial_started_at || null,
      expiresAt: sub.trial_expires_at || null,
      daysRemaining: 0,
      hoursRemaining: 0,
      countdownLabel: 'Active Plan',
      canStartTrial: false,
    };
  }

  const rawStatus = (sub?.trial_status as TrialStatus) || 'not_started';
  const startedAt = sub?.trial_started_at || null;
  const expiresAt = sub?.trial_expires_at || null;

  if (!sub || rawStatus === 'not_started' || !startedAt || !expiresAt) {
    return {
      status: 'not_started',
      isActive: false,
      isExpired: false,
      isConverted: false,
      isNotStarted: true,
      startedAt: null,
      expiresAt: null,
      daysRemaining: FREE_TRIAL_DURATION_DAYS,
      hoursRemaining: FREE_TRIAL_DURATION_DAYS * 24,
      countdownLabel: 'Not Started',
      canStartTrial: true,
    };
  }

  if (rawStatus === 'converted') {
    return {
      status: 'converted',
      isActive: false,
      isExpired: false,
      isConverted: true,
      isNotStarted: false,
      startedAt,
      expiresAt,
      daysRemaining: 0,
      hoursRemaining: 0,
      countdownLabel: 'Active Plan',
      canStartTrial: false,
    };
  }

  // Calculate remaining time against authoritative database timestamp
  const now = Date.now();
  const expiresTime = new Date(expiresAt).getTime();
  const diffMs = expiresTime - now;

  if (diffMs <= 0 || rawStatus === 'expired' || sub.status === 'expired') {
    return {
      status: 'expired',
      isActive: false,
      isExpired: true,
      isConverted: false,
      isNotStarted: false,
      startedAt,
      expiresAt,
      daysRemaining: 0,
      hoursRemaining: 0,
      countdownLabel: 'Trial expired',
      canStartTrial: false,
    };
  }

  // Active trial countdown calculation
  const hours = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  let countdownLabel: string;
  if (diffMs < 24 * 60 * 60 * 1000) {
    countdownLabel = 'Trial expires today';
  } else {
    countdownLabel = `${days} days left`;
  }

  return {
    status: 'active',
    isActive: true,
    isExpired: false,
    isConverted: false,
    isNotStarted: false,
    startedAt,
    expiresAt,
    daysRemaining: days,
    hoursRemaining: hours,
    countdownLabel,
    canStartTrial: false,
  };
}
