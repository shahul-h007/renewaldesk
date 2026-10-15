'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  CreditCard,
  ShieldCheck,
  Sparkles,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function BillingPage() {
  const { user, business: authBiz } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);

  const fetchBillingData = useCallback(async () => {
    if (!authBiz?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/billing/usage?businessId=${authBiz.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e: any) {
      console.error('Failed to load billing details', e);
    } finally {
      setIsLoading(false);
    }
  }, [authBiz?.id]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleStartTrial = async () => {
    if (!authBiz?.id) return;
    setActivatingTrial(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/billing/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: authBiz.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to start free trial.');
      }
      await fetchBillingData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to start trial.');
    } finally {
      setActivatingTrial(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your monthly subscription? You will retain access until the end of your paid billing cycle.')) {
      return;
    }
    setCancelling(true);
    setCancelMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: authBiz?.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to cancel subscription.');
      }
      setCancelMessage(result.message);
      await fetchBillingData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const usage = data?.usage || {
    activeCount: 0,
    archivedCount: 0,
    maxCapacity: 0,
    remainingCapacity: 0,
    isAtCapacity: false,
    planId: 'not_started',
    planName: 'Trial Not Started',
    isLifetime: false,
    status: 'incomplete',
  };

  const trial = data?.trial;
  const sub = data?.subscription;
  const isOwner = data?.role === 'owner';
  const percentage = Math.min(100, Math.round((usage.activeCount / Math.max(1, usage.maxCapacity)) * 100));

  return (
    <AppShell
      title="Billing & Capacity Management"
      subtitle="Manage your active plan, customer capacity limit, and subscription renewal."
    >
      <div className="max-w-4xl space-y-6">
        {cancelMessage && (
          <div role="alert" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{cancelMessage}</span>
            </div>
            <button onClick={() => setCancelMessage(null)} className="font-bold text-emerald-700">×</button>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold text-red-700">×</button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">
                  {trial && !trial.isConverted ? (
                    trial.isNotStarted
                      ? '14-Day Free Trial (Not Activated)'
                      : trial.isExpired
                      ? '14-Day Free Trial (Expired)'
                      : '14-Day Free Trial'
                  ) : (
                    `${usage.planName} Plan`
                  )}
                </h2>
                {usage.isLifetime ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    Founding Lifetime {sub?.lifetime_slot_number ? `(Seat #${sub.lifetime_slot_number})` : ''}
                  </span>
                ) : trial && !trial.isConverted ? (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    trial.isNotStarted
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : trial.isExpired
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {trial.countdownLabel}
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    usage.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {usage.status === 'active' ? 'Active' : 'Standard'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usage.isLifetime
                  ? 'One-time payment active. No recurring fees while RenewalDesk service operates.'
                  : trial && !trial.isConverted
                  ? trial.isNotStarted
                    ? 'Start your trial to unlock 25 active customers for 14 days. No credit card required.'
                    : trial.isExpired
                    ? 'Your trial expired. All customer records are preserved, but adding new customers is paused.'
                    : `Active trial expires on ${new Date(trial.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. No auto-charge.`
                  : sub?.current_period_end
                  ? `Renews on ${new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Monthly recurring subscription.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {trial && trial.isNotStarted ? (
                isOwner && (
                  <button
                    onClick={handleStartTrial}
                    disabled={activatingTrial}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {activatingTrial ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <span>Start 14-Day Free Trial</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  <span>{trial && trial.isExpired ? 'Choose a Paid Plan' : 'Upgrade / Change Plan'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Active Customer Capacity Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-800">Active Customer Capacity</span>
              </div>
              <div className="font-mono text-xs">
                <span className="font-black text-gray-900">{usage.activeCount.toLocaleString('en-IN')}</span>
                <span className="text-gray-400"> / {usage.maxCapacity.toLocaleString('en-IN')} customers</span>
                <span className="text-gray-500 font-semibold ml-1.5">({percentage}%)</span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span>{usage.remainingCapacity.toLocaleString('en-IN')} available spots remaining</span>
              <span>{usage.archivedCount.toLocaleString('en-IN')} archived records preserved</span>
            </div>
          </div>

          {/* Warning Banner when near or at capacity, or expired */}
          {trial?.isExpired ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">Free Trial Expired</p>
                <p className="text-rose-800 leading-relaxed">
                  Your 14-day trial has concluded. All your historical customer and service records are preserved and readable, but creating or importing new customers is paused. Choose a paid plan to resume adding customers.
                </p>
                <div className="pt-2">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs"
                  >
                    <span>Choose a Paid Plan</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : usage.isAtCapacity && usage.maxCapacity > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">Active Customer Capacity Limit Reached</p>
                <p className="text-amber-800 leading-relaxed">
                  Your workspace has reached its limit of {usage.maxCapacity} active customers. New customer creation and imports are paused until you upgrade or archive inactive records. Existing records and schedules remain fully operational.
                </p>
                <div className="pt-2">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs"
                  >
                    <span>Upgrade Plan Capacity</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* Cancellation section for monthly plans */}
          {!usage.isLifetime && sub?.status === 'active' && !sub?.cancel_at_period_end && isOwner && (
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-gray-800">Cancel Subscription</p>
                <p className="text-gray-500 text-[11px]">You will retain access until the end of your billing cycle.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          )}

          {sub?.cancel_at_period_end && (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
              Your subscription is scheduled for cancellation at the end of the current billing cycle. Access remains active until then.
            </div>
          )}
        </div>

        {/* Feature Entitlements Guarantee */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            All Features Included Across Plans & Trial
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Click-to-Chat Reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full Service Recurrence Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Multi-Appliance Customer Profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Excel / CSV Customer Spreadsheet Importer</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
