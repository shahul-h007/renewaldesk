import crypto from 'node:crypto';
import Razorpay from 'razorpay';

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
  };
}

export function getRazorpayInstance(): Razorpay {
  const { keyId, keySecret, isConfigured } = getRazorpayCredentials();

  if (!isConfigured) {
    throw new Error('Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Verify Razorpay order payment signature (for one-time lifetime orders).
 * Signature formula: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyOrderPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) return false;

  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(params.signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay subscription payment signature (for recurring monthly subscriptions).
 * Signature formula: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret)
 */
export function verifySubscriptionPaymentSignature(params: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) return false;

  const body = `${params.paymentId}|${params.subscriptionId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(params.signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay webhook signature.
 * Signature formula: HMAC_SHA256(raw_body, webhook_secret)
 */
export function verifyWebhookSignature(rawBody: string, receivedSignature: string): boolean {
  const { webhookSecret } = getRazorpayCredentials();
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(receivedSignature, 'utf-8')
    );
  } catch {
    return false;
  }
}
