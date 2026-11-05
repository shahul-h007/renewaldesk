'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  CreditCard,
  Users,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

export default function BillingPage() {
  const { business: authBiz } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const toast = useToast();

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

  const executeCancelSubscription = async () => {
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
      toast.success(result.message || 'Subscription cancelled successfully.');
      await fetchBillingData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to cancel subscription.');
      toast.error(err.message || 'Unable to cancel subscription.');
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
      <div className="max-w-4xl mx-auto space-y-6">
        {cancelMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{cancelMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setCancelMessage(null)}
              className="font-bold text-emerald-700 p-1"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="font-bold text-red-700 p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <Card>
          <CardContent className="p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
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
                    <Badge variant="neutral">
                      Founding Lifetime {sub?.lifetime_slot_number ? `(Seat #${sub.lifetime_slot_number})` : ''}
                    </Badge>
                  ) : trial && !trial.isConverted ? (
                    trial.isNotStarted ? (
                      <Badge variant="warning">{trial.countdownLabel}</Badge>
                    ) : trial.isExpired ? (
                      <Badge variant="danger">{trial.countdownLabel}</Badge>
                    ) : (
                      <Badge variant="neutral">{trial.countdownLabel}</Badge>
                    )
                  ) : usage.status === 'active' ? (
                    <Badge variant="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Standard</Badge>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {usage.isLifetime
                    ? 'One-time payment active. No recurring fees while RenewalDesk service operates.'
                    : trial && !trial.isConverted
                    ? trial.isNotStarted
                      ? 'Start your trial to unlock 25 active customers for 14 days. No credit card required.'
                      : trial.isExpired
                      ? 'Your trial expired. All customer records are preserved, but adding new customers is paused.'
                      : `Active trial expires on ${new Date(trial.expiresAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}. No auto-charge.`
                    : sub?.current_period_end
                    ? `Renews on ${new Date(sub.current_period_end).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'Monthly recurring subscription.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {trial && trial.isNotStarted ? (
                  isOwner && (
                    <Button
                      variant="primary"
                      onClick={handleStartTrial}
                      disabled={activatingTrial}
                      leftIcon={activatingTrial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                      rightIcon={!activatingTrial ? <ArrowRight className="w-3.5 h-3.5" /> : undefined}
                    >
                      {activatingTrial ? 'Activating...' : 'Start 14-Day Free Trial'}
                    </Button>
                  )
                ) : (
                  <Link href="/pricing">
                    <Button
                      variant="primary"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {trial && trial.isExpired ? 'Choose a Paid Plan' : 'Upgrade / Change Plan'}
                    </Button>
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

              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 pt-1">
                <span>{usage.remainingCapacity.toLocaleString('en-IN')} available spots remaining</span>
                <span>{usage.archivedCount.toLocaleString('en-IN')} archived records preserved</span>
              </div>
            </div>

            {/* Warning Banner when near or at capacity, or expired */}
            {trial?.isExpired ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold">Free Trial Expired</p>
                  <p className="text-red-800 leading-relaxed">
                    Your 14-day trial has concluded. All your historical customer and service records are preserved and readable, but creating or importing new customers is paused. Choose a paid plan to resume adding customers.
                  </p>
                  <div className="pt-2">
                    <Link href="/pricing">
                      <Button variant="danger" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        Choose a Paid Plan
                      </Button>
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
                    <Link href="/pricing">
                      <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        Upgrade Plan Capacity
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Cancellation section for monthly plans */}
            {!usage.isLifetime && sub?.status === 'active' && !sub?.cancel_at_period_end && isOwner && (
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-800">Cancel Subscription</p>
                  <p className="text-gray-500 text-[11px]">
                    You will retain access until the end of your billing cycle.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelling}
                  className="text-red-700 hover:bg-red-50 hover:text-red-800 border-red-200"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </Button>
              </div>
            )}

            {sub?.cancel_at_period_end && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                Your subscription is scheduled for cancellation at the end of the current billing cycle. Access remains active until then.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Entitlements Guarantee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-gray-400 font-bold">
              All Features Included Across Plans & Trial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>WhatsApp Click-to-Chat Reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Full Service Recurrence Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-Appliance Customer Profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Excel / CSV Customer Spreadsheet Importer</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Cancellation Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Monthly Subscription"
        description="Are you sure you want to cancel your monthly subscription? You will retain access until the end of your current paid billing period."
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={cancelling}
              onClick={async () => {
                setShowCancelModal(false);
                await executeCancelSubscription();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        }
      >
        <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs space-y-1">
          <p className="font-bold">Cancellation terms:</p>
          <p className="text-red-700 text-[11px] leading-relaxed">
            Your workspace capacity will remain active until your current billing period ends. No subsequent renewals will be charged to your payment method.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
