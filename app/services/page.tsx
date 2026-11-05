'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { ServiceTypeModal } from '@/components/ServiceTypeModal';
import { ServiceCatalogItem } from '@/lib/types';
import { formatIntervalDisplay } from '@/lib/due-date-engine';
import { formatINR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  Wrench,
  Plus,
  Clock,
  Edit2,
  Power,
  Users,
  Sparkles,
} from 'lucide-react';

export default function ServicesPage() {
  const { catalog, business, services, toggleServiceTypeStatus, isLoaded } = useRenewalDesk();
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();

  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  if (isCloudLoading) {
    return (
      <AppShell
        title="Service Types & Recurrence Cycles"
        subtitle="Define default repeat intervals (cadence) and standard prices for your services."
      >
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
          <div className="h-10 w-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
                <div className="h-5 w-24 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const activeCount = catalog.filter((c) => c.isActive !== false).length;
  const inactiveCount = catalog.filter((c) => c.isActive === false).length;

  const filteredCatalog = catalog.filter((item) => {
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
        <Button
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Service Type
        </Button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar with Action & Filter Tabs */}
        <Card>
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Standard Service Catalog</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                When a service is marked completed, RenewalDesk automatically schedules the next due date based on these intervals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium overflow-x-auto no-scrollbar max-w-full">
                <button
                  type="button"
                  onClick={() => setFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
                    filterTab === 'ALL'
                      ? 'bg-white text-gray-900 font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({catalog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
                    filterTab === 'ACTIVE'
                      ? 'bg-white text-emerald-800 font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('INACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
                    filterTab === 'INACTIVE'
                      ? 'bg-white text-gray-700 font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {/* Direct CTA on Mobile */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                className="sm:hidden shrink-0"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Catalog Cards Grid */}
        {filteredCatalog.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item) => {
              const customerCount = new Set(
                services
                  .filter((s) => s.serviceName.toLowerCase() === item.name.toLowerCase())
                  .map((s) => s.customerId)
              ).size;
              const isActive = item.isActive !== false;

              return (
                <Card
                  key={item.id}
                  className={`p-5 space-y-4 flex flex-col justify-between ${
                    isActive
                      ? 'hover:border-blue-300 transition-all'
                      : 'bg-gray-50/60 opacity-80'
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
                          <Badge variant="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="neutral" dot>
                            Inactive
                          </Badge>
                        )}

                        <Badge variant="neutral">
                          <Users className="w-3 h-3 text-gray-400 mr-1 inline" />
                          {customerCount} {customerCount === 1 ? 'customer' : 'customers'}
                        </Badge>
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
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-800 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Repeats every {formatIntervalDisplay(item.intervalValue, item.intervalUnit)}</span>
                    </div>
                  </div>

                  {/* Footer Fee & Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Typical Fee</span>
                      <span
                        suppressHydrationWarning
                        className="text-sm font-bold text-gray-900 font-mono"
                      >
                        {business.currency}{formatINR(item.typicalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          toggleServiceTypeStatus(item.id);
                          toast.success(`"${item.name}" ${item.isActive ? 'deactivated' : 'activated'}.`);
                        }}
                        title={isActive ? 'Deactivate service type' : 'Activate service type'}
                        className={`p-2 rounded-lg border text-xs transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                          isActive
                            ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 border-gray-200'
                            : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No service types found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {filterTab === 'ALL'
                ? 'Add your business service types to configure automated reminder cycles and standard pricing.'
                : `No ${filterTab.toLowerCase()} service types currently in your catalog.`}
            </p>
            {filterTab === 'ALL' && (
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Service Type
              </Button>
            )}
          </Card>
        )}

        {/* Explain the Repeat Cycle */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">How Service Cycles Drive Retention</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-blue-800">
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
              <span className="font-bold block text-blue-950 mb-1">1. Tailored Cadence</span>
              Set customized intervals in days, months, or years for different services (e.g. 3 months for quarterly visits, 6 months for routine service, 12 months for comprehensive care).
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
