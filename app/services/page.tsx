'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { ServiceTypeModal } from '@/components/ServiceTypeModal';
import { ServiceCatalogItem } from '@/lib/types';
import { formatIntervalDisplay } from '@/lib/due-date-engine';
import { formatINR } from '@/lib/format';
import {
  Wrench,
  Plus,
  Clock,
  Edit2,
  Power,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function ServicesPage() {
  const { catalog, business, services, toggleServiceTypeStatus } = useRenewalDesk();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const activeCount = catalog.filter(c => c.isActive !== false).length;
  const inactiveCount = catalog.filter(c => c.isActive === false).length;

  const filteredCatalog = catalog.filter(item => {
    if (filterTab === 'ACTIVE') return item.isActive !== false;
    if (filterTab === 'INACTIVE') return item.isActive === false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: ServiceCatalogItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  return (
    <AppShell
      title="Service Types & Recurrence Cycles"
      subtitle="Define default repeat intervals (cadence) and standard prices for your services."
      headerActions={
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Add Service Type</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header Bar with Action & Filter Tabs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Standard Service Catalog</h2>
            <p className="text-xs text-gray-500">
              When a service is marked completed, RenewalDesk automatically schedules the next due date based on these intervals.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-white text-gray-900 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({catalog.length})
              </button>
              <button
                onClick={() => setFilterTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterTab === 'ACTIVE'
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilterTab('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterTab === 'INACTIVE'
                    ? 'bg-white text-gray-700 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            {/* Direct CTA */}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Type</span>
            </button>
          </div>
        </div>

        {/* Catalog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((item) => {
            const customerCount = new Set(
              services
                .filter(s => s.serviceName.toLowerCase() === item.name.toLowerCase())
                .map(s => s.customerId)
            ).size;
            const isActive = item.isActive !== false;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all relative flex flex-col justify-between ${
                  isActive
                    ? 'border-gray-200 hover:border-blue-300'
                    : 'border-gray-200 bg-gray-50/60 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Status & Usage */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Inactive
                        </span>
                      )}

                      <span
                        className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full flex items-center gap-1"
                        title={`${customerCount} distinct customer(s) enrolled`}
                      >
                        <Users className="w-3 h-3 text-gray-400" />
                        {customerCount} {customerCount === 1 ? 'customer' : 'customers'}
                      </span>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1 italic">No description provided</p>
                    )}
                  </div>

                  {/* Cadence Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Repeats every {formatIntervalDisplay(item.intervalValue, item.intervalUnit)}</span>
                  </div>
                </div>

                {/* Footer Fee & Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400 block">Typical Fee</span>
                    <span
                      suppressHydrationWarning
                      className="text-sm font-extrabold text-gray-900"
                    >
                      {business.currency}{formatINR(item.typicalPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleServiceTypeStatus(item.id)}
                      title={isActive ? 'Deactivate service type' : 'Activate service type'}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isActive
                          ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 border-gray-200'
                          : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explain the Repeat Cycle */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">How Service Cycles Drive Retention</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-blue-800">
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-bold block text-blue-950 mb-1">1. Tailored Cadence</span>
              Set customized intervals in days, months, or years for different appliances (e.g. 45 days for deep filters, 12 months for comprehensive wash).
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-bold block text-blue-950 mb-1">2. 1-Click WhatsApp Outreach</span>
              When the time approaches, customers automatically surface in your morning follow-up queue with the right template pre-filled.
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-bold block text-blue-950 mb-1">3. Automated Rescheduling</span>
              Clicking &quot;Completed&quot; instantly pushes the next due date forward using the exact interval you configured here.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ServiceTypeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        itemToEdit={editingItem}
      />
    </AppShell>
  );
}
