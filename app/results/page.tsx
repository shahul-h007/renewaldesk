'use client';

import React, { useState, useMemo } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatReadableDate } from '@/lib/due-date-engine';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import { formatAddressSummary } from '@/lib/address-utils';
import { calculateResultsAnalytics, AnalyticsPeriod } from '@/lib/analytics-utils';

export default function ResultsPage() {
  const { services, customers, serviceHistory, business, isLoaded } = useRenewalDesk();
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

  const dateSpanText =
    analytics.bounds.startDate && analytics.bounds.endDate
      ? `${formatReadableDate(analytics.bounds.startDate)} — ${formatReadableDate(analytics.bounds.endDate)}`
      : 'All historical records';

  return (
    <AppShell
      title="Recovered Revenue & ROI"
      subtitle="Track the exact money recovered by bringing past customers back for repeat service."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Date Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700">Reporting Period:</span>
            <span className="text-xs text-gray-500 font-mono hidden md:inline">({dateSpanText})</span>
          </div>

          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
            <div className="inline-flex p-1 bg-gray-100 rounded-xl min-w-max">
              {periodOptions.map((opt) => {
                const active = selectedPeriod === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPeriod(opt.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
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
                <span suppressHydrationWarning className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
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

            <div className="relative z-10 pt-6 mt-4 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200">
              <span>
                Avg. Ticket Size: <strong className="text-white font-mono">{business.currency || '₹'}{formatINR(analytics.averageTicketSize)}</strong>
              </span>
              <span>
                Distinct Customers Served: <strong className="text-white font-mono">{analytics.completedCustomersCount}</strong>
              </span>
            </div>
          </div>

          {/* Projected Due Pipeline Card */}
          <Card className="flex flex-col justify-between space-y-4 p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Due Pipeline
                </span>
                <Badge variant="neutral">Estimated</Badge>
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

            <div className="p-3.5 bg-gray-50 rounded-xl space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Cycles due in period:</span>
                <strong className="text-gray-900 font-mono">{analytics.schedulesDueInPeriodCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Distinct customers:</span>
                <strong className="text-gray-900 font-mono">{analytics.customersDueInPeriodCount}</strong>
              </div>
              <p className="text-[10px] text-gray-400 pt-1.5 border-t border-gray-200">
                Calculated from catalog service rates. Confirmed once the technician marks the service completed.
              </p>
            </div>
          </Card>
        </div>

        {/* Operational KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Customer Base & Cycle Coverage */}
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Cycle Coverage</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {analytics.activeCycleCoveragePct}%
              </span>
              <span className="text-xs text-gray-500 font-mono">
                ({analytics.customersWithActiveCycles} of {analytics.totalCustomers})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Customers enrolled in recurring service cycles. Multi-asset customers are counted once.
            </p>
          </Card>

          {/* Customers Due in Period */}
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Customers Due</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                {analytics.customersDueInPeriodCount}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                ({analytics.schedulesDueInPeriodCount} {analytics.schedulesDueInPeriodCount === 1 ? 'cycle' : 'cycles'})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Distinct customers due in {analytics.bounds.label.toLowerCase()}.
            </p>
          </Card>

          {/* Overdue Attention */}
          <Card
            className={`p-5 space-y-2 ${
              analytics.overdueCustomersInPeriodCount > 0 ? 'bg-amber-50/40 border-amber-200' : ''
            }`}
          >
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Overdue Follow-ups
              </span>
              <AlertTriangle
                className={`w-4 h-4 ${
                  analytics.overdueCustomersInPeriodCount > 0 ? 'text-amber-600' : 'text-gray-400'
                }`}
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold font-mono ${
                  analytics.overdueCustomersInPeriodCount > 0 ? 'text-amber-900' : 'text-gray-900'
                }`}
              >
                {analytics.overdueCustomersInPeriodCount}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                ({analytics.overdueSchedulesInPeriodCount} overdue)
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-tight">
              {analytics.overdueCustomersInPeriodCount > 0
                ? 'Past-due services not yet completed.'
                : 'All due cycles in this period are up to date!'}
            </p>
          </Card>

          {/* Schedule Health / Invalid Dates */}
          <Card className="p-5 space-y-2">
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
                {analytics.schedulesWithInvalidDueDateCount === 0
                  ? '100%'
                  : `${analytics.schedulesWithInvalidDueDateCount} issues`}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {analytics.schedulesWithInvalidDueDateCount === 0 ? 'valid dates' : 'missing due date'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              {analytics.schedulesWithInvalidDueDateCount > 0
                ? 'Missing due dates are safely excluded from due/overdue counts.'
                : 'All recurring service schedules have valid calendar due dates.'}
            </p>
          </Card>
        </div>

        {/* 5-Stage Customer Recovery Funnel */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>The 5-Stage Customer Recovery Funnel</CardTitle>
              <CardDescription>
                How service cycles due in <span className="font-semibold text-gray-700">{analytics.bounds.label}</span> convert from reminder to payment.
              </CardDescription>
            </div>
            <Badge variant="neutral">
              Baseline: {analytics.schedulesDueInPeriodCount} due {analytics.schedulesDueInPeriodCount === 1 ? 'cycle' : 'cycles'}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
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

                <div className="text-[10px] text-gray-400 font-mono">
                  {stage.formulaDescription}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Completed Services Log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Completed Service Log</CardTitle>
              <CardDescription>
                Repeat jobs finished in <span className="font-semibold text-gray-700">{analytics.bounds.label}</span> with verified revenue collections.
              </CardDescription>
            </div>
            <Badge variant="success" dot>
              {analytics.completedServicesCount} Completed
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 text-xs">
              {analytics.completedRecordsInPeriod.length > 0 ? (
                analytics.completedRecordsInPeriod.map((record) => {
                  const customer = customers.find((c) => c.id === record.customerId);
                  const addressStr = customer ? formatAddressSummary(customer) : '';
                  return (
                    <div
                      key={record.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">
                            {customer?.name || 'Customer Record'}
                          </h4>
                          <Badge variant="success">COMPLETED</Badge>
                        </div>
                        <p className="text-gray-500">
                          {record.serviceName}
                          {addressStr ? ` • ${addressStr}` : ''}
                        </p>
                        {record.notes && (
                          <p className="text-[11px] text-gray-400 italic">
                            {record.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span suppressHydrationWarning className="font-bold text-emerald-700 text-base block font-mono">
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
                <div className="py-14 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">
                    No services marked completed in {analytics.bounds.label.toLowerCase()}.
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Mark services completed in the Today queue to recover revenue and log repeat jobs here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
