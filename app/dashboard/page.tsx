'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { FollowUpRow } from '@/components/FollowUpRow';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { TrialBanner } from '@/components/TrialBanner';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { GuidedTour } from '@/components/GuidedTour';
import { isTourCompleted, isTourSkipped } from '@/lib/tour-config';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  Upload,
  Search,
  Sparkles,
  RefreshCw,
  Users,
  Plus,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { formatINR } from '@/lib/format';

type TabKey = 'OVERDUE' | 'TODAY' | 'WEEK' | 'COMPLETED';

export default function DashboardPage() {
  const router = useRouter();
  const { services, customers, assets, business, isDatabaseMode, isLoadingDb, isLoaded, dbError, reloadFromDb } = useRenewalDesk();
  const { user, business: authBiz, isConfigured, isLoading: isAuthLoading, authError } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('OVERDUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [billingUsage, setBillingUsage] = useState<any>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Check URL ?tour=true query param or automatic first-run launch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasTourParam = params.get('tour') === 'true';
    const bizId = authBiz?.id || business?.id;

    if (hasTourParam) {
      setIsTourOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (isLoaded && !isTourCompleted(bizId) && !isTourSkipped(bizId)) {
      setIsTourOpen(true);
    }
  }, [isLoaded, authBiz?.id, business?.id]);

  const fetchUsage = React.useCallback(() => {
    if (!authBiz?.id) return;
    fetch(`/api/billing/usage?businessId=${authBiz.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setBillingUsage(data);
        }
      })
      .catch((err) => console.warn('Could not load billing usage on dashboard:', err));
  }, [authBiz?.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // If user is authenticated in cloud mode but has no business account yet, redirect to onboarding
  useEffect(() => {
    if (isConfigured && !isAuthLoading && user && !authBiz && !authError) {
      router.push('/onboarding');
    }
  }, [isConfigured, isAuthLoading, user, authBiz, authError, router]);

  // Metrics
  const overdueServices = services.filter(s => s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED');
  const todayServices = services.filter(s => s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED');
  const weekServices = services.filter(s => s.urgency === 'DUE_THIS_WEEK' && s.followUpStatus !== 'COMPLETED');
  const completedServices = services.filter(s => s.followUpStatus === 'COMPLETED');

  // Total recovered revenue from completed services
  const recoveredRevenue = completedServices.reduce((sum, s) => sum + (s.serviceAmount || 0), 0);
  const potentialRecoverableRevenue = [...overdueServices, ...todayServices, ...weekServices].reduce(
    (sum, s) => sum + (s.serviceAmount || 0), 0
  );

  // Filtered queue by active tab
  let filtered = services.filter(s => {
    if (activeTab === 'OVERDUE') return s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'TODAY') return s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'WEEK') return s.urgency === 'DUE_THIS_WEEK' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'COMPLETED') return s.followUpStatus === 'COMPLETED';
    return s.followUpStatus !== 'COMPLETED';
  });

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => {
      const c = customers.find(cust => cust.id === s.customerId);
      const a = assets.find(ast => ast.id === s.assetId);
      return (
        c?.name.toLowerCase().includes(q) ||
        c?.phone.includes(q) ||
        c?.locality?.toLowerCase().includes(q) ||
        c?.city?.toLowerCase().includes(q) ||
        c?.address?.toLowerCase().includes(q) ||
        c?.landmark?.toLowerCase().includes(q) ||
        a?.name.toLowerCase().includes(q)
      );
    });
  }

  // Sort: Overdue first, then Due Today, then chronological
  filtered.sort((a, b) => {
    if (a.urgency === 'OVERDUE' && b.urgency !== 'OVERDUE') return -1;
    if (b.urgency === 'OVERDUE' && a.urgency !== 'OVERDUE') return 1;
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  // Canonical 4 Segmented Tabs
  const tabs: TabItem[] = [
    { id: 'OVERDUE', label: 'Overdue', count: overdueServices.length, icon: AlertCircle },
    { id: 'TODAY', label: 'Today', count: todayServices.length, icon: Clock },
    { id: 'WEEK', label: 'This week', count: weekServices.length, icon: Calendar },
    { id: 'COMPLETED', label: 'Completed', count: completedServices.length, icon: CheckCircle2 },
  ];

  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  if (isCloudLoading) {
    return (
      <AppShell
        title="Today's Follow-up Queue"
        subtitle="Track upcoming service cycles and send 1-click WhatsApp reminders."
      >
        <DashboardSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Today's Follow-up Queue"
      subtitle="Find customers due for service, send WhatsApp reminders, and book renewals."
      headerActions={
        <div className="flex items-center gap-2">
          {/* Quick "Edit message templates" shortcut */}
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-2xs transition-colors min-h-[38px]"
            title="Configure WhatsApp templates and AI message generator"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Edit Templates</span>
            <span className="sm:hidden">Templates</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Cloud Error Alert Banner */}
        {(dbError || authError) && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900 text-sm">Cloud Database Connection Issue</p>
                <p className="text-red-700 mt-0.5">{dbError || authError}</p>
              </div>
            </div>
            {reloadFromDb && (
              <button
                type="button"
                onClick={() => reloadFromDb()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shrink-0 shadow-xs min-h-[36px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        )}

        {/* 14-Day Free Trial Banner */}
        {billingUsage?.trial && (
          <TrialBanner
            businessId={authBiz?.id}
            isOwner={billingUsage.role === 'owner'}
            trial={billingUsage.trial}
            activeCount={billingUsage.usage?.activeCount ?? customers.length}
            maxCapacity={billingUsage.usage?.maxCapacity ?? 25}
            onTrialStarted={() => fetchUsage()}
          />
        )}

        {/* Getting Started Onboarding Checklist Card */}
        <OnboardingChecklist
          onOpenAddCustomer={() => setShowAddModal(true)}
          onStartTour={() => setIsTourOpen(true)}
          businessId={authBiz?.id || business?.id}
        />

        {/* Top KPI Cards (Tappable to jump to tabs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Overdue */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('OVERDUE')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('OVERDUE')}
            className={`p-3.5 sm:p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs select-none ${
              activeTab === 'OVERDUE'
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200/80 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overdue</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{overdueServices.length}</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Action Required
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5 line-clamp-1">
              Passed scheduled service date
            </p>
          </div>

          {/* Due Today */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('TODAY')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('TODAY')}
            className={`p-3.5 sm:p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs select-none ${
              activeTab === 'TODAY'
                ? 'border-orange-500 ring-2 ring-orange-500/20'
                : 'border-gray-200/80 hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due Today</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{todayServices.length}</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Call Target
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5 line-clamp-1">
              Due for service renewal today
            </p>
          </div>

          {/* This Week */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('WEEK')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('WEEK')}
            className={`p-3.5 sm:p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs select-none ${
              activeTab === 'WEEK'
                ? 'border-amber-500 ring-2 ring-amber-500/20'
                : 'border-gray-200/80 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">This Week</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{weekServices.length}</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Upcoming
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5 line-clamp-1">
              Due within next 7 days
            </p>
          </div>

          {/* Recovered Revenue */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('COMPLETED')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('COMPLETED')}
            className={`p-3.5 sm:p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-2xs select-none ${
              activeTab === 'COMPLETED'
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-gray-200/80 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Completed</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span suppressHydrationWarning className="text-xl sm:text-2xl font-black text-emerald-700 truncate">
                {business.currency}{formatINR(recoveredRevenue)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                {completedServices.length} saved
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5 line-clamp-1">
              Retained from return visits
            </p>
          </div>
        </div>

        {/* Main Action Queue Container */}
        <div data-tour="tour-today-queue" className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          {/* Controls Bar: Segmented Tabs + Search + Template Shortcut */}
          <div className="p-3.5 sm:p-4 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Segmented Control Tabs */}
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as TabKey)}
              variant="pill"
            />

            {/* Search Input */}
            <div className="w-full md:w-72">
              <Input
                placeholder="Search customer, phone, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={Search}
                className="py-2"
              />
            </div>
          </div>

          {/* Desktop Table Header (Hidden on Mobile) */}
          <div className="hidden md:flex items-center justify-between px-5 py-3 bg-gray-50/70 border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="w-1/4">Customer</div>
            <div className="w-1/5">Appliance / Service</div>
            <div className="w-1/6">Due Status</div>
            <div className="w-20 text-right pr-4">Fee</div>
            <div className="shrink-0">Immediate Actions</div>
          </div>

          {/* List Content */}
          <div className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((service) => {
                const customer = customers.find(c => c.id === service.customerId);
                const asset = assets.find(a => a.id === service.assetId);
                return (
                  <FollowUpRow
                    key={service.id}
                    service={service}
                    customer={customer}
                    asset={asset}
                  />
                );
              })
            ) : customers.length === 0 ? (
              /* First-Run Empty State */
              <div data-tour="tour-add-customer" className="p-6 sm:p-12">
                <EmptyState
                  icon={Users}
                  title="Start Your First Service Recovery Cycle"
                  description="Add your first customer or import your customer list via CSV to automatically track recurring maintenance dates and send WhatsApp reminders."
                  primaryAction={{
                    label: 'Add your first customer',
                    onClick: () => setShowAddModal(true),
                    icon: Plus,
                  }}
                  secondaryAction={{
                    label: 'Import from CSV',
                    onClick: () => router.push('/import'),
                    icon: Upload,
                  }}
                  tip="Small AC & RO shops typically recover 30-40% of overdue customers in their first week with 1-click reminders."
                />
              </div>
            ) : (
              /* Tab Caught-Up Empty State */
              <div className="p-6 sm:p-12">
                <EmptyState
                  icon={CheckCircle2}
                  title={searchQuery ? 'No matching customers found' : "You're all caught up! 🎉"}
                  description={
                    searchQuery
                      ? 'Try searching with a different name, phone number, or locality.'
                      : `No pending customers in the ${tabs.find(t => t.id === activeTab)?.label || 'active'} tab. All due services have been contacted or scheduled.`
                  }
                  secondaryAction={
                    searchQuery
                      ? {
                          label: 'Clear search',
                          onClick: () => setSearchQuery(''),
                        }
                      : activeTab !== 'OVERDUE' && overdueServices.length > 0
                      ? {
                          label: `View Overdue (${overdueServices.length})`,
                          onClick: () => setActiveTab('OVERDUE'),
                          icon: AlertCircle,
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Opportunity Banner */}
        {potentialRecoverableRevenue > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <h3 className="text-sm font-bold">Unclaimed Revenue Opportunity</h3>
              </div>
              <p className="text-xs text-blue-200">
                There is <span suppressHydrationWarning className="font-bold text-white">{business.currency}{formatINR(potentialRecoverableRevenue)}</span> in repeat service waiting to be unlocked in your pending follow-up queue.
              </p>
            </div>
            <Link
              href="/results"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 transition-colors shadow-xs shrink-0"
            >
              <span>View Revenue Funnel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        businessId={authBiz?.id || business?.id}
      />
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="w-8 h-8 rounded-lg bg-gray-100" />
            </div>
            <div className="h-8 w-14 bg-gray-200 rounded" />
            <div className="h-2.5 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-6 space-y-4">
        <div className="h-10 w-full bg-gray-100 rounded-xl" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
