import { BillingPlanId, BillingType } from './plans';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'incomplete';

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: BillingPlanId;
  billingType: BillingType;
  status: SubscriptionStatus;
  maxActiveCustomers: number;
  razorpayCustomerId?: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  isLifetime: boolean;
  lifetimeSlotNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentTransactionStatus =
  | 'created'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface PaymentTransaction {
  id: string;
  businessId: string;
  userId?: string | null;
  planId: string;
  billingType: string;
  amountPaise: number;
  currency: string;
  status: PaymentTransactionStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySubscriptionId?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCapacityUsage {
  activeCount: number;
  archivedCount: number;
  maxCapacity: number;
  remainingCapacity: number;
  isAtCapacity: boolean;
  isOverCapacity: boolean;
  planId: string;
  planName: string;
  isLifetime: boolean;
  status: SubscriptionStatus;
}
