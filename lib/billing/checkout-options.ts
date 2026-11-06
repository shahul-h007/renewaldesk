/**
 * Razorpay Standard Checkout options builder.
 * Constructs options for both one-time orders (Founding Lifetime) and monthly recurring subscriptions.
 * 
 * Supports optional custom checkout configuration ID via NEXT_PUBLIC_RAZORPAY_CONFIG_ID.
 * If unset or empty, config_id is omitted completely so default Razorpay checkout behavior is preserved.
 */

export interface CheckoutSessionData {
  keyId: string;
  type: 'order' | 'subscription';
  amount?: number;
  currency?: string;
  orderId?: string;
  subscriptionId?: string;
}

export interface CheckoutPlanData {
  id: string;
  name: string;
  maxActiveCustomers: number;
}

export interface CheckoutCustomerData {
  businessId: string;
  businessName?: string;
  businessPhone?: string;
  userEmail?: string;
}

export interface BuildCheckoutOptionsParams {
  session: CheckoutSessionData;
  plan: CheckoutPlanData;
  customer: CheckoutCustomerData;
  onSuccess: (response: any) => Promise<void>;
  onDismiss?: () => void;
  configId?: string;
}

/**
 * Reads the optional Razorpay checkout configuration ID from environment variables.
 * Returns undefined if unset, empty, or whitespace-only.
 */
export function getRazorpayConfigId(): string | undefined {
  const configId = process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID;
  if (!configId) return undefined;
  const trimmed = configId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Builds the options payload for `new window.Razorpay(options)`.
 * Passes `config_id` only if NEXT_PUBLIC_RAZORPAY_CONFIG_ID is set.
 */
export function buildRazorpayCheckoutOptions({
  session,
  plan,
  customer,
  onSuccess,
  onDismiss,
  configId = getRazorpayConfigId(),
}: BuildCheckoutOptionsParams): Record<string, any> {
  const options: Record<string, any> = {
    key: session.keyId,
    name: 'RenewalDesk',
    description: `${plan.name} Plan — Up to ${plan.maxActiveCustomers} active customers`,
    image: '/brand/renewaldesk-logo.svg',
    prefill: {
      name: customer.businessName || '',
      email: customer.userEmail || '',
      contact: customer.businessPhone || '',
    },
    notes: {
      businessId: customer.businessId,
      planId: plan.id,
    },
    theme: {
      color: '#2563eb', // Blue-600
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
    },
  };

  // Attach config_id ONLY if provided and non-empty
  const resolvedConfigId = configId?.trim();
  if (resolvedConfigId) {
    options.config_id = resolvedConfigId;
  }

  if (session.type === 'order') {
    // One-time payment (Founding Lifetime)
    options.order_id = session.orderId;
    options.amount = session.amount;
    options.currency = session.currency;
    options.handler = async (response: any) => {
      await onSuccess({
        businessId: customer.businessId,
        planId: plan.id,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
    };
  } else {
    // Monthly recurring subscription
    options.subscription_id = session.subscriptionId;
    options.handler = async (response: any) => {
      await onSuccess({
        businessId: customer.businessId,
        planId: plan.id,
        subscriptionId: response.razorpay_subscription_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
    };
  }

  return options;
}
