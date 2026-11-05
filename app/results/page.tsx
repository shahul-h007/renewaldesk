'use client';

import React, { useState, useMemo } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { formatReadableDate } from '@/lib/due-date-engine';
import {
  Sparkles,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import { formatAddressSummary } from '@/lib/address-utils';
import { calculateResultsAnalytics, AnalyticsPeriod } from '@/lib/analytics-utils';

export default function ResultsPage() {
  const { services, customers, serviceHistory, business, isLoadingDb, isLoaded } = useRenewalDesk();
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('ALL_TIME');

  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  const analytics = useMemo(() => {
    return calculateResultsAnalytics({
      customers,
      services,
      serviceHistory,
      period: selectedPeriod,
    });
  }, [customers, services, serviceHistory, selectedPeriod]);

  if (isCloudLoading) {
    return (
      <AppShell
        title="Recovered Revenue & ROI"
        subtitle="Track the exact money recovered by bringing past customers back for repeat service."
      >
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-gray-200 rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white border border-gray-200 rounded-2xl p-4" />
            ))}
          </div>
          <div className="h-80 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const periodOptions: { id: AnalyticsPeriod; label: string }[] = [
    { id: 'ALL_TIME', label: 'All Time' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { id: 'THIS_QUARTER', label: 'This Quarter' },
  ];

  const dateSpanText = analytics.bounds.startDate && analytics.bounds.endDate
    ? `${formatReadableDate(analytics.bounds.startDate)} — ${formatReadableDate(analytics.bounds.endDate)}`
    : 'All historical records';

  return (
    <AppShell
      title="Recovered Revenue & ROI"
      subtitle="Track the exact money recovered by bringing past customers back for repeat service."
    >
      <div className="space-y-6">
        {/* Date Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700">Reporting Period:</span>
            <span className="text-xs text-gray-500 font-mono hidden md:inline">({dateSpanText})</span>
          </div>

          <div className="inline-flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
            {periodOptions.map((opt) => {
              const active = selectedPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedPeriod(opt.id)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Revenue & Pipeline Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Confirmed Recovered Revenue */}
          <div className="lg:col-span-2 bg-gradient-to-r from-emerald-900 via-teal-900 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Confirmed Recovered Revenue ({analytics.bounds.label})
              </span>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span suppressHydrationWarning className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {business.currency || '₹'}{formatINR(analytics.confirmedRevenue)}
                </span>
                <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {analytics.completedServicesCount} completed {analytics.completedServicesCount === 1 ? 'service' : 'services'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                Actual fees collected from repeat services marked complete in RenewalDesk. Never counts speculative or future projections.
              </p>
            </div>

            <div className="relative z-10 pt-6 mt-4 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200">
              <span>Avg. Ticket Size: <strong className="text-white font-mono">{business.currency || '₹'}{formatINR(analytics.averageTicketSize)}</strong></span>
              <span>Distinct Customers Served: <strong className="text-white font-mono">{analytics.completedCustomersCount}</strong></span>
            </div>
          </div>

          {/* Projected Due Pipeline Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Due Pipeline
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  Estimated
                </span>
              </div>
              <div>
                <span suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-gray-900 block font-mono">
                  {business.currency || '₹'}{formatINR(analytics.projectedDuePipeline)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Value of {analytics.schedulesDueInPeriodCount} service {analytics.schedulesDueInPeriodCount === 1 ? 'cycle' : 'cycles'} due in {analytics.bounds.label.toLowerCase()}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Cycles due in period:</span>
                <strong className="text-gray-900 font-mono">{analytics.schedulesDueInPeriodCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Distinct customers:</span>
                <strong className="text-gray-900 font-mono">{analytics.customersDueInPeriodCount}</strong>
              </div>
              <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-200">
                Calculated from catalog service rates. Confirmed once the technician marks the service completed.
              </p>
            </div>
          </div>
        </div>

        {/* Operational KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Customer Base & Cycle Coverage */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Cycle Coverage</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {analytics.activeCycleCoveragePct}%
              </span>
              <span className="text-xs text-gray-500">
                ({analytics.customersWithActiveCycles} of {analytics.totalCustomers})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Customers enrolled in recurring service cycles. Multi-asset customers are counted once.
            </p>
          </div>

          {/* Customers Due in Period */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Customers Due</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {analytics.customersDueInPeriodCount}
              </span>
              <span className="text-xs text-gray-500">
                ({analytics.schedulesDueInPeriodCount} {analytics.schedulesDueInPeriodCount === 1 ? 'cycle' : 'cycles'})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Distinct customers due in {analytics.bounds.label.toLowerCase()}.
            </p>
          </div>

          {/* Overdue Attention */}
          <div className={`rounded-2xl border p-5 space-y-2 shadow-xs ${
            analytics.overdueCustomersInPeriodCount > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Overdue Follow-ups</span>
              <AlertTriangle className={`w-4 h-4 ${analytics.overdueCustomersInPeriodCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono ${
                analytics.overdueCustomersInPeriodCount > 0 ? 'text-amber-900' : 'text-gray-900'
              }`}>
                {analytics.overdueCustomersInPeriodCount}
              </span>
              <span className="text-xs text-gray-500">
                ({analytics.overdueSchedulesInPeriodCount} overdue)
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-tight">
              {analytics.overdueCustomersInPeriodCount > 0
                ? 'Past-due services not yet completed.'
                : 'All due cycles in this period are up to date!'}
            </p>
          </div>

          {/* Schedule Health / Invalid Dates */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Schedule Integrity</span>
              {analytics.schedulesWithInvalidDueDateCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {analytics.schedulesWithInvalidDueDateCount === 0 ? '100%' : `${analytics.schedulesWithInvalidDueDateCount} issues`}
              </span>
              <span className="text-xs text-gray-500">
                {analytics.schedulesWithInvalidDueDateCount === 0 ? 'valid dates' : 'missing due date'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              {analytics.schedulesWithInvalidDueDateCount > 0
                ? 'Missing due dates are safely excluded from due/overdue counts.'
                : 'All recurring service schedules have valid calendar due dates.'}
            </p>
          </div>
        </div>

        {/* 5-Stage Customer Recovery Funnel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">The 5-Stage Customer Recovery Funnel</h2>
              <p className="text-xs text-gray-500">
                How service cycles due in <span className="font-semibold text-gray-700">{analytics.bounds.label}</span> convert from reminder to payment.
              </p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600 self-start sm:self-auto font-mono">
              Baseline: {analytics.schedulesDueInPeriodCount} due {analytics.schedulesDueInPeriodCount === 1 ? 'cycle' : 'cycles'}
            </span>
          </div>

          <div className="space-y-4">
            {analytics.funnelStages.map((stage) => (
              <div key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{stage.label}</span>
                    <span className="text-gray-400 hidden sm:inline">• {stage.description}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-gray-900">{stage.count}</span>
                    <span className="text-gray-500 font-semibold">({stage.pct}%)</span>
                  </div>
                </div>

                {/* Funnel Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                    style={{ width: `${stage.count > 0 ? Math.max(stage.barWidthPct, 4) : 0}%` }}
                  />
                </div>

                <div className="text-[10px] text-gray-400">
                  {stage.formulaDescription}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Services Log */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Completed Service Log</h2>
              <p className="text-xs text-gray-500">
                Repeat jobs finished in <span className="font-semibold text-gray-700">{analytics.bounds.label}</span> with verified revenue collections.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {analytics.completedServicesCount} Completed
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
            {analytics.completedRecordsInPeriod.length > 0 ? (
              analytics.completedRecordsInPeriod.map((record) => {
                const customer = customers.find((c) => c.id === record.customerId);
                const addressStr = customer ? formatAddressSummary(customer) : '';
                return (
                  <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{customer?.name || 'Customer Record'}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                          COMPLETED
                        </span>
                      </div>
                      <p className="text-gray-500">
                        {record.serviceName}{addressStr ? ` • ${addressStr}` : ''}
                      </p>
                      {record.notes && (
                        <p className="text-[11px] text-gray-400 italic">
                          {record.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-left sm:text-right">
                      <span suppressHydrationWarning className="font-bold text-emerald-700 text-sm block font-mono">
                        {business.currency || '₹'}{formatINR(record.feeCharged)}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        Completed: {formatReadableDate(record.serviceDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-medium text-gray-500">
                  No services marked completed in {analytics.bounds.label.toLowerCase()}.
                </p>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  Mark services completed in the Follow-up Queue to recover revenue and log repeat jobs here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
