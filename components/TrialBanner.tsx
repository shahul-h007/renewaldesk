'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, ShieldAlert, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { TrialInfo } from '@/lib/billing/plans';

interface TrialBannerProps {
  businessId?: string;
  isOwner?: boolean;
  trial?: TrialInfo | null;
  activeCount?: number;
  maxCapacity?: number;
  onTrialStarted?: () => void;
}

export function TrialBanner({
  businessId,
  isOwner = true,
  trial,
  activeCount = 0,
  maxCapacity = 25,
  onTrialStarted,
}: TrialBannerProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If user is already on a paid/converted plan, do not render a trial banner
  if (!trial || trial.isConverted) {
    return null;
  }

  const handleStartTrial = async () => {
    if (!businessId) return;
    setIsActivating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/billing/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start free trial.');
      }

      if (onTrialStarted) {
        onTrialStarted();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error starting free trial:', err);
      setErrorMsg(err?.message || 'Failed to activate trial.');
    } finally {
      setIsActivating(false);
    }
  };

  // State 1: Trial Not Started
  if (trial.isNotStarted) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Start your 14-day free trial
              </h3>
              <p className="mt-0.5 text-xs text-amber-700 sm:text-sm">
                Track service renewals, send WhatsApp follow-ups, and manage up to 25 active customers. ₹0, no credit card required, and no automatic charges.
              </p>
              {errorMsg && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isOwner ? (
              <button
                onClick={handleStartTrial}
                disabled={isActivating || !businessId}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 sm:text-sm"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs font-medium text-amber-800">
                Workspace owner must activate trial
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Trial Expired
  if (trial.isExpired) {
    return (
      <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                  Trial Expired
                </span>
                <h3 className="text-sm font-semibold text-rose-950">
                  Your 14-day free trial has expired
                </h3>
              </div>
              <p className="mt-1 text-xs text-rose-700 sm:text-sm">
                All your customer records and service histories are safely preserved, but adding or importing new customers is paused. Upgrade to continue managing your renewals seamlessly.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 sm:text-sm"
            >
              <span>Choose a Paid Plan</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Active Trial
  const expiresFormatted = trial.expiresAt
    ? new Date(trial.expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const isEndingSoon = trial.daysRemaining <= 3;

  return (
    <div
      className={`mb-6 rounded-xl border p-4 shadow-sm sm:p-5 ${
        isEndingSoon
          ? 'border-amber-200 bg-amber-50/80 text-amber-950'
          : 'border-blue-200 bg-blue-50/70 text-slate-900'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${
              isEndingSoon ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isEndingSoon
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-blue-200 text-blue-900'
                }`}
              >
                {trial.countdownLabel}
              </span>
              <h3 className="text-sm font-semibold">
                14-Day Free Trial Active
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Expires on <span className="font-semibold">{expiresFormatted}</span>. Currently using{' '}
              <span className="font-semibold">
                {activeCount} / {maxCapacity}
              </span>{' '}
              active customers.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
