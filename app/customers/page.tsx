'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { calculateDueStatus, formatReadableDate } from '@/lib/due-date-engine';
import { UrgencyBadge, StatusBadge } from '@/components/Badge';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { CompleteServiceModal } from '@/components/CompleteServiceModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { Search, UserPlus, Phone, MessageSquare, Trash2, CheckCircle2, ChevronRight, AlertCircle, Plus, Upload, Users } from 'lucide-react';
import { Customer, Asset, ServiceRecord } from '@/lib/types';

export default function CustomersPage() {
  const { customers, assets, services, deleteCustomer, business, isLoadingDb, isLoaded } = useRenewalDesk();
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // WhatsApp & Complete Modals state
  const [activeWhatsApp, setActiveWhatsApp] = useState<{ customer: Customer; asset?: Asset; service?: ServiceRecord } | null>(null);
  const [activeComplete, setActiveComplete] = useState<{ customer: Customer; asset?: Asset; service?: ServiceRecord } | null>(null);

  const isCloudLoading = isConfigured && (isAuthLoading || isLoadingDb || !isLoaded);

  if (isCloudLoading) {
    return (
      <AppShell
        title="Customer Directory"
        subtitle="Manage registered customers, appliances, and renewal cycles."
      >
        <CustomersSkeleton />
      </AppShell>
    );
  }

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    const custAssets = assets.filter(a => a.customerId === c.id);
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.locality?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      custAssets.some(a => a.name.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell
      title="Customer Directory"
      subtitle={`Manage all ${customers.length} registered customers, assets, and service history.`}
    >
      <div className="space-y-6">
        {/* Search & Actions Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, or locality..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="text-xs text-gray-500 self-end sm:self-center">
            Showing <span className="font-bold text-gray-800">{filteredCustomers.length}</span> of {customers.length} customers
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Customer Details</div>
            <div className="col-span-3">Appliance & Asset</div>
            <div className="col-span-3">Service Schedule</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => {
                const custAssets = assets.filter(a => a.customerId === cust.id);
                const custServices = services.filter(s => s.customerId === cust.id);
                const latestService = custServices[0];
                const primaryAsset = custAssets[0];
                const dueInfo = latestService ? calculateDueStatus(latestService.nextDueDate) : null;

                return (
                  <div
                    key={cust.id}
                    className="p-4 sm:px-6 sm:py-4.5 hover:bg-gray-50/80 transition-colors flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center"
                  >
                    {/* Customer */}
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{cust.name}</h4>
                        {latestService && <StatusBadge status={latestService.followUpStatus} />}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {cust.phone} • {cust.locality || cust.address || 'Kochi'}
                      </p>
                    </div>

                    {/* Assets */}
                    <div className="col-span-3 min-w-0">
                      {custAssets.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {primaryAsset.name} {primaryAsset.capacity ? `(${primaryAsset.capacity})` : ''}
                          </p>
                          {custAssets.length > 1 && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              +{custAssets.length - 1} more appliance
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No appliance added</span>
                      )}
                    </div>

                    {/* Due Date & Urgency */}
                    <div className="col-span-3 min-w-0">
                      {latestService && dueInfo ? (
                        <div>
                          <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span>
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No active service</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5 w-full sm:w-auto">
                      {latestService && (
                        <button
                          onClick={() => setActiveWhatsApp({ customer: cust, asset: primaryAsset, service: latestService })}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="WhatsApp Customer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}

                      <a
                        href={`tel:${cust.phone}`}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {latestService && latestService.followUpStatus !== 'COMPLETED' && (
                        <button
                          onClick={() => setActiveComplete({ customer: cust, asset: primaryAsset, service: latestService })}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Mark Completed & Next Due Date"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Delete customer ${cust.name}?`)) {
                            deleteCustomer(cust.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : customers.length === 0 ? (
              <div className="py-16 text-center px-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                  <Users className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    No customers registered yet
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    Add your first customer to track their appliances, service schedules, and renewal cycles.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Customer</span>
                  </button>
                  <Link
                    href="/import"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import CSV</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs">
                No customers found matching &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {activeWhatsApp && (
        <WhatsAppModal
          isOpen={true}
          onClose={() => setActiveWhatsApp(null)}
          customer={activeWhatsApp.customer}
          asset={activeWhatsApp.asset}
          service={activeWhatsApp.service}
        />
      )}

      {/* Complete Modal */}
      {activeComplete && (
        <CompleteServiceModal
          isOpen={true}
          onClose={() => setActiveComplete(null)}
          customer={activeComplete.customer}
          asset={activeComplete.asset}
          service={activeComplete.service}
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </AppShell>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="h-9 w-72 bg-gray-100 rounded-lg" />
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="h-11 bg-gray-50 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-4">
              <div className="space-y-1.5 w-1/3">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-44 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-28 bg-gray-100 rounded hidden sm:block w-1/4" />
              <div className="h-5 w-24 bg-gray-100 rounded-full w-1/4" />
              <div className="flex gap-2 justify-end">
                <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                <div className="w-7 h-7 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
