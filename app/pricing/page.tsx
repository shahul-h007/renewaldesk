'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/lib/auth-context';
import { PLANS_LIST, BillingPlan, FOUNDING_LIFETIME_MAX_SLOTS } from '@/lib/billing/plans';
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Clock,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const { user, business: authBiz, isConfigured } = useAuth();

  const [lifetimeSlotsClaimed, setLifetimeSlotsClaimed] = useState<number>(0);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [pendingVerificationPayload, setPendingVerificationPayload] = useState<any>(null);
  const [isRetryingVerification, setIsRetryingVerification] = useState(false);

  // Fetch current usage and lifetime slots claimed
  useEffect(() => {
    async function loadUsage() {
      if (authBiz?.id) {
        try {
          const res = await fetch(`/api/billing/usage?businessId=${authBiz.id}`);
          if (res.ok) {
            const data = await res.json();
            setActivePlanId(data?.usage?.planId || null);
            setLifetimeSlotsClaimed(data?.lifetimeSlotsClaimed || 0);
          }
        } catch (e) {
          console.error('Failed to load billing usage', e);
        }
      }
    }
    loadUsage();
  }, [authBiz]);

  const handleSelectPlan = async (plan: BillingPlan) => {
    if (processingPlanId) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    // If user is not logged in, take them to signup or login
    if (!user) {
      router.push(`/login?redirectTo=/pricing`);
      return;
    }

    if (!authBiz) {
      router.push(`/onboarding`);
      return;
    }

    if (activePlanId === plan.id) {
      setErrorMessage(`Your workspace is already subscribed to the ${plan.name} plan.`);
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      // 1. Create checkout session on server
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: authBiz.id,
          planId: plan.id,
        }),
      });

      const session = await response.json();

      if (!response.ok || session.error) {
        throw new Error(session.error || 'Failed to initiate checkout session.');
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay Checkout SDK is still loading. Please retry in a few moments.');
      }

      // 2. Launch Razorpay Standard Checkout modal
      const options: any = {
        key: session.keyId,
        name: 'RenewalDesk',
        description: `${plan.name} Plan — Up to ${plan.maxActiveCustomers} active customers`,
        image: '/brand/renewaldesk-logo.svg',
        prefill: {
          name: authBiz.name || '',
          email: user.email || '',
          contact: authBiz.phone || '',
        },
        notes: {
          businessId: authBiz.id,
          planId: plan.id,
        },
        theme: {
          color: '#2563eb', // Blue-600
        },
        modal: {
          ondismiss: () => {
            setProcessingPlanId(null);
          },
        },
      };

      if (session.type === 'order') {
        // One-time payment (Founding Lifetime)
        options.order_id = session.orderId;
        options.amount = session.amount;
        options.currency = session.currency;
        options.handler = async (response: any) => {
          await verifyPayment({
            businessId: authBiz.id,
            planId: plan.id,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        };
      } else {
        // Monthly Recurring Subscription
        options.subscription_id = session.subscriptionId;
        options.handler = async (response: any) => {
          await verifyPayment({
            businessId: authBiz.id,
            planId: plan.id,
            subscriptionId: response.razorpay_subscription_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        };
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setProcessingPlanId(null);
        setErrorMessage(
          resp.error?.description || 'Payment was declined or failed. Please retry with a valid payment method.'
        );
      });
      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Unable to open payment modal. Please try again.');
      setProcessingPlanId(null);
    }
  };

  const verifyPayment = async (verificationPayload: any) => {
    try {
      setPendingVerificationPayload(verificationPayload);
      setIsRetryingVerification(true);
      const res = await fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationPayload),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Payment verification failed on the server.');
      }

      setPendingVerificationPayload(null);
      setErrorMessage(null);
      setActivePlanId(result.planId);
      setSuccessMessage(
        `Payment successful! Your workspace is now activated on the ${result.planName} plan (${result.maxActiveCustomers} active customer capacity).`
      );
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    } catch (verifyErr: any) {
      console.error('Verification error:', verifyErr);
      setErrorMessage(
        verifyErr.message || 'Payment completed, but verification timed out. Your access will activate automatically once confirmed.'
      );
    } finally {
      setIsRetryingVerification(false);
      setProcessingPlanId(null);
    }
  };

  const remainingLifetimeSlots = Math.max(0, FOUNDING_LIFETIME_MAX_SLOTS - lifetimeSlotsClaimed);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setIsRazorpayLoaded(true)}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo variant="mark" size="md" href="/" priority />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link href="/demo" className="hover:text-blue-600 transition-colors">
              Live Demo
            </Link>
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Follow-up Queue
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full space-y-12">
        {/* Banner Notification for Errors or Success */}
        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5 max-w-3xl mx-auto">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Payment Error</p>
              <p className="mt-0.5 text-red-800">{errorMessage}</p>
              {pendingVerificationPayload && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => verifyPayment(pendingVerificationPayload)}
                    disabled={isRetryingVerification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetryingVerification ? 'animate-spin' : ''}`} />
                    <span>{isRetryingVerification ? 'Activating Subscription...' : 'Retry Subscription Activation'}</span>
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 text-sm font-bold">×</button>
          </div>
        )}

        {successMessage && (
          <div role="alert" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-start gap-2.5 max-w-3xl mx-auto animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Upgrade Complete</p>
              <p className="mt-0.5 text-emerald-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Affordable Plans for Growing Service Businesses</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple, Transparent Capacity-Based Pricing
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Every plan includes RenewalDesk’s complete feature set—WhatsApp click-to-chat links, automatic service recurrence calculation, multi-appliance customer profiles, and Excel imports. Choose the active-customer capacity that fits your operation.
          </p>
        </div>

        {/* Pricing Cards Grid (6 Plans) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PLANS_LIST.map((plan) => {
            const isCurrent = activePlanId === plan.id;
            const isProcessing = processingPlanId === plan.id;
            const isLifetime = plan.isLifetime;
            const isRecommended = plan.isRecommended;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                  isRecommended
                    ? 'border-2 border-blue-600 bg-white shadow-xl ring-4 ring-blue-50'
                    : isLifetime
                    ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-50/50 to-white shadow-lg'
                    : 'border border-slate-200 bg-white shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Badges */}
                {isRecommended && (
                  <span className="absolute -top-3 left-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    Recommended Starting Option
                  </span>
                )}
                {isLifetime && (
                  <span className="absolute -top-3 left-6 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    Limited Launch Offer ({remainingLifetimeSlots} of 25 left)
                  </span>
                )}

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="pt-2 pb-1 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                        ₹{plan.priceINR}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {isLifetime ? 'one-time payment' : '/ month'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isLifetime
                        ? 'Pay once. No recurring RenewalDesk fee while service operates.'
                        : 'Renews monthly. Cancel anytime from your account settings.'}
                    </p>
                  </div>

                  {/* Capacity Highlight */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Active Customer Capacity</span>
                      <span className="text-blue-600 font-mono text-sm font-black">
                        {plan.maxActiveCustomers.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Store and track reminders for up to {plan.maxActiveCustomers.toLocaleString('en-IN')} active customers. Archived records remain safely preserved.
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">
                      Included with this plan:
                    </p>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Instant WhatsApp Follow-up click-to-chat links</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Automatic cycle scheduling (days, months, years)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Multiple ACs & appliances per customer profile</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Excel / CSV customer sheet importer</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Customizable reminder templates & status history</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || isProcessing || (isLifetime && remainingLifetimeSlots === 0)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isCurrent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : isRecommended
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                        : isLifetime
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Checkout...</span>
                      </>
                    ) : isCurrent ? (
                      <span>Active on Your Workspace</span>
                    ) : isLifetime && remainingLifetimeSlots === 0 ? (
                      <span>Sold Out (25/25 Claimed)</span>
                    ) : (
                      <>
                        <span>{isLifetime ? 'Claim Lifetime Access (₹599)' : `Subscribe to ${plan.name}`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Disclosures & Terms Section */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Billing Policies, Renewal Terms & Disclosures</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
            <div>
              <h3 className="font-bold text-slate-800 mb-1">Monthly Subscription Billing</h3>
              <p>
                Monthly plans renew automatically every month via Razorpay Subscriptions. You can cancel your subscription at any time directly from the Account Settings page. Upon cancellation, your workspace retains active capacity until the end of the current paid billing cycle.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">Founding Lifetime Offer Terms</h3>
              <p>
                The Founding Lifetime plan is a one-time payment of ₹599. It grants a maximum capacity of 100 active customers to one business workspace with no recurring RenewalDesk subscription fees for as long as the service remains operational. It does not promise that the service or company will operate indefinitely.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">Active Customer Capacity</h3>
              <p>
                Capacity applies to active (non-archived) customers. If your business reaches its active limit, you can upgrade your plan or archive past inactive customers to free up space. Existing records and history are never deleted.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">Refund & Cancellation Policy</h3>
              <p>
                Subscription renewals may be cancelled before the next billing cycle. Because RenewalDesk operates on pay-as-you-go monthly pricing with immediate server capacity allocation, fees for partially used billing cycles are generally non-refundable once activated. Contact <a href="mailto:shahulhmd.connect@gmail.com" className="text-blue-600 underline">support</a> for billing inquiries.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo variant="mark" size="sm" href="/" invertText subtitle="— Transparent Pricing" />
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/pricing" className="hover:text-white text-white font-semibold">Pricing</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
