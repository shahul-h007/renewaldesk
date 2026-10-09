'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { FollowUpRow } from '@/components/FollowUpRow';
import { AlertCircle, Clock, Calendar, CheckCircle2, DollarSign, Upload, Search, Filter, Sparkles } from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function DashboardPage() {
  const { services, customers, assets, business } = useRenewalDesk();
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'WEEK' | 'COMPLETED'>('OVERDUE');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filtered queue
  let filtered = services.filter(s => {
    if (activeTab === 'OVERDUE') return s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'TODAY') return s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'WEEK') return s.urgency === 'DUE_THIS_WEEK' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'COMPLETED') return s.followUpStatus === 'COMPLETED';
    return s.followUpStatus !== 'COMPLETED'; // ALL pending
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => {
      const c = customers.find(cust => cust.id === s.customerId);
      const a = assets.find(ast => ast.id === s.assetId);
      return (
        c?.name.toLowerCase().includes(q) ||
        c?.phone.includes(q) ||
        c?.locality?.toLowerCase().includes(q) ||
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

  return (
    <AppShell
      title="Daily Follow-up Queue"
      subtitle={`Find customers due for service, send WhatsApp, and secure bookings.`}
    >
      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Overdue */}
          <div
            onClick={() => setActiveTab('OVERDUE')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'OVERDUE' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{overdueServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Customers passed their recommended service date
            </p>
          </div>

          {/* Card 2: Due Today */}
          <div
            onClick={() => setActiveTab('TODAY')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'TODAY' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Today</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{todayServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Call Target
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Scheduled for service renewal today
            </p>
          </div>

          {/* Card 3: Due This Week */}
          <div
            onClick={() => setActiveTab('WEEK')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'WEEK' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due This Week</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{weekServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Upcoming
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Due within the next 7 days
            </p>
          </div>

          {/* Card 4: Recovered Revenue */}
          <div
            onClick={() => setActiveTab('COMPLETED')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'COMPLETED' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recovered Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {business.currency}{formatINR(recoveredRevenue)}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {completedServices.length} saved
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Revenue retained from completed return visits
            </p>
          </div>
        </div>

        {/* The Action Queue Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Header Bar with Tabs & Search */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Urgency Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('OVERDUE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'OVERDUE'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔴 Overdue ({overdueServices.length})
              </button>

              <button
                onClick={() => setActiveTab('TODAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'TODAY'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🟠 Due Today ({todayServices.length})
              </button>

              <button
                onClick={() => setActiveTab('WEEK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'WEEK'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🟡 This Week ({weekServices.length})
              </button>

              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Attention ({overdueServices.length + todayServices.length + weekServices.length})
              </button>

              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✓ Completed ({completedServices.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, area..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Table Header Row (Hidden on mobile) */}
          <div className="hidden sm:flex items-center justify-between px-6 py-3 bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="w-1/4">Customer</div>
            <div className="w-1/5">Appliance / Service</div>
            <div className="w-1/5">Due Status</div>
            <div className="w-24 text-right">Fee</div>
            <div className="w-44 text-right">Immediate Actions</div>
          </div>

          {/* Rows List */}
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
            ) : (
              <div className="py-16 text-center px-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {searchQuery ? 'No customers found matching your search' : "You're all caught up! 🎉"}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with a different name or phone number.'
                    : 'No pending follow-ups in this tab right now. All due customers have been contacted or scheduled.'}
                </p>
                {!searchQuery && (
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Link
                      href="/import"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import more customers
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Opportunity Banner */}
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
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-blue-900 hover:bg-blue-50 transition-colors shadow-xs shrink-0"
          >
            View Recovery Funnel
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
