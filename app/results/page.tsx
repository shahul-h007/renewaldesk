'use client';

import React from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { formatReadableDate } from '@/lib/due-date-engine';
import { DollarSign, CheckCircle2, MessageSquare, Calendar, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function ResultsPage() {
  const { services, customers, business } = useRenewalDesk();

  // Calculation of funnel stages
  const totalDue = services.length;
  const contacted = services.filter(s => ['CONTACTED', 'REPLIED', 'BOOKED', 'COMPLETED'].includes(s.followUpStatus)).length;
  const replied = services.filter(s => ['REPLIED', 'BOOKED', 'COMPLETED'].includes(s.followUpStatus)).length;
  const booked = services.filter(s => ['BOOKED', 'COMPLETED'].includes(s.followUpStatus)).length;
  const completed = services.filter(s => s.followUpStatus === 'COMPLETED');

  const recoveredRevenue = completed.reduce((sum, s) => sum + (s.serviceAmount || 0), 0);
  const projectedPotential = services.reduce((sum, s) => sum + (s.serviceAmount || 0), 0);

  const funnelStages = [
    { label: '1. Customers Due', count: totalDue, pct: 100, color: 'bg-blue-600', text: 'Total customer records in cycle' },
    { label: '2. Contacted on WhatsApp', count: contacted, pct: Math.round((contacted / (totalDue || 1)) * 100), color: 'bg-emerald-500', text: 'WhatsApp messages triggered' },
    { label: '3. Customer Replied', count: replied, pct: Math.round((replied / (totalDue || 1)) * 100), color: 'bg-purple-500', text: 'Interested or requested time' },
    { label: '4. Service Booked', count: booked, pct: Math.round((booked / (totalDue || 1)) * 100), color: 'bg-indigo-500', text: 'Technician visit appointment set' },
    { label: '5. Completed & Paid', count: completed.length, pct: Math.round((completed.length / (totalDue || 1)) * 100), color: 'bg-green-600', text: 'Service executed & revenue recovered' },
  ];

  return (
    <AppShell
      title="Recovered Revenue & ROI"
      subtitle="Track the exact money recovered by bringing past customers back for repeat service."
    >
      <div className="space-y-6">
        {/* Hero Revenue Card */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-blue-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Direct Customer Recovery Impact
            </span>
            <div className="flex items-baseline gap-3">
              <span suppressHydrationWarning className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                {business.currency}{formatINR(recoveredRevenue)}
              </span>
              <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {completed.length} repeat services
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              This is revenue collected from existing customers who were contacted at the right time through RenewalDesk before they could call an outside competitor.
            </p>
          </div>
        </div>

        {/* 5-Stage Funnel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-gray-900">The 5-Stage Customer Recovery Funnel</h2>
            <p className="text-xs text-gray-500">
              How due service reminders convert into paying repeat jobs.
            </p>
          </div>

          <div className="space-y-4">
            {funnelStages.map((stage, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{stage.label}</span>
                    <span className="text-gray-400 hidden sm:inline">• {stage.text}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-gray-900">{stage.count}</span>
                    <span className="text-gray-400">({stage.pct}%)</span>
                  </div>
                </div>

                {/* Funnel Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                    style={{ width: `${Math.max(stage.pct, 4)}%` }}
                  />
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
              <p className="text-xs text-gray-500">Repeat jobs finished and their next scheduled cycle.</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {completed.length} Completed
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
            {completed.length > 0 ? (
              completed.map((service) => {
                const customer = customers.find(c => c.id === service.customerId);
                return (
                  <div key={service.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                    <div>
                      <h4 className="font-bold text-gray-900">{customer?.name}</h4>
                      <p className="text-gray-500">{service.serviceName} • {customer?.locality}</p>
                    </div>
                    <div className="text-right">
                      <span suppressHydrationWarning className="font-bold text-emerald-700 text-sm block">
                        {business.currency}{formatINR(service.serviceAmount)}
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium">
                        Next Due: {formatReadableDate(service.nextDueDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs">
                No services marked completed yet. Mark completed services in the Follow-up Queue to see them here!
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
