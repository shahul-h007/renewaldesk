'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { calculateDueStatus } from '@/lib/due-date-engine';
import { UrgencyBadge, StatusBadge } from '@/components/Badge';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { CompleteServiceModal } from '@/components/CompleteServiceModal';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { DropdownPortal } from '@/components/ui/DropdownPortal';
import {
  formatCustomerAddress,
  formatAddressSummary,
  hasSufficientAddress,
  getGoogleMapsSearchUrl,
  copyToClipboard,
} from '@/lib/address-utils';
import { fetchArchivedCustomersInDb, reactivateCustomerInDb } from '@/lib/db/operations';
import {
  Search,
  Phone,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Plus,
  Upload,
  Users,
  Copy,
  Check,
  Navigation,
  MoreVertical,
  RotateCcw,
  Archive,
  Eye,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Customer, Asset, ServiceRecord } from '@/lib/types';

type DirectoryTab = 'ACTIVE' | 'ARCHIVED';

export default function CustomersPage() {
  const {
    customers,
    assets,
    services,
    deleteCustomer,
    restoreCustomer,
    reloadFromDb,
    business,
    isDatabaseMode,
    isLoadingDb,
    isLoaded,
  } = useRenewalDesk();
  const { user, business: authBiz, isConfigured, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<DirectoryTab>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [moreMenuCustomerId, setMoreMenuCustomerId] = useState<string | null>(null);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);

  // Archived customers state
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load archived customers when switching to ARCHIVED tab
  useEffect(() => {
    if (activeTab === 'ARCHIVED' && isDatabaseMode && authBiz?.id) {
      setIsLoadingArchived(true);
      fetchArchivedCustomersInDb(authBiz.id)
        .then((data) => setArchivedCustomers(data))
        .catch((err) => {
          console.warn('Could not load archived customers:', err);
          toast.error('Failed to load archived customers');
        })
        .finally(() => setIsLoadingArchived(false));
    }
  }, [activeTab, isDatabaseMode, authBiz?.id, toast]);

  // WhatsApp & Complete Modals state
  const [activeWhatsApp, setActiveWhatsApp] = useState<{ customer: Customer; asset?: Asset; service?: ServiceRecord } | null>(null);
  const [activeComplete, setActiveComplete] = useState<{ customer: Customer; asset?: Asset; service?: ServiceRecord } | null>(null);

  const handleCopyAddress = async (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const addressText = formatCustomerAddress(cust);
    if (!addressText) {
      toast.warning(`No address recorded for ${cust.name}`);
      return;
    }
    const res = await copyToClipboard(addressText);
    if (res.success) {
      toast.success(`Address copied for ${cust.name}!`);
    } else {
      toast.error(res.error || 'Failed to copy address');
    }
  };

  const handleArchiveCustomer = (cust: Customer) => {
    setMoreMenuCustomerId(null);
    setCustomerToArchive(cust);
  };

  const confirmArchiveCustomer = async () => {
    if (!customerToArchive) return;
    const cust = customerToArchive;
    setCustomerToArchive(null);
    deleteCustomer(cust.id);

    toast.undo(
      `${cust.name} was archived. Reminders paused.`,
      () => {
        void handleRestoreCustomer(cust);
      },
      'Customer Archived',
      5000
    );
  };

  const handleRestoreCustomer = async (cust: Customer) => {
    setRestoringId(cust.id);
    try {
      if (restoreCustomer) {
        const res = await restoreCustomer(cust.id);
        if (!res.success) throw new Error(res.error);
      } else if (authBiz?.id) {
        await reactivateCustomerInDb(authBiz.id, cust.id);
        await reloadFromDb?.();
      }
      setArchivedCustomers((prev) => prev.filter((c) => c.id !== cust.id));
      toast.success(`${cust.name} restored to active directory!`, 'Customer Restored');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore customer. Check active plan limits.');
    } finally {
      setRestoringId(null);
    }
  };

  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  if (isCloudLoading) {
    return (
      <AppShell
        title="Customer Directory"
        subtitle="Manage registered clients, appliances, and maintenance cadences."
      >
        <CustomersSkeleton />
      </AppShell>
    );
  }

  // Filter Active Customers
  const filteredActiveCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const custAssets = assets.filter((a) => a.customerId === c.id);
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.locality?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.pincode?.toLowerCase().includes(q) ||
      c.landmark?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      custAssets.some((a) => a.name.toLowerCase().includes(q))
    );
  });

  // Filter Archived Customers
  const filteredArchivedCustomers = archivedCustomers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.locality?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const directoryTabs: TabItem[] = [
    { id: 'ACTIVE', label: 'Active Customers', count: customers.length, icon: Users },
    { id: 'ARCHIVED', label: 'Archived', count: archivedCustomers.length > 0 ? archivedCustomers.length : undefined, icon: Archive },
  ];

  return (
    <AppShell
      title="Customer Directory"
      subtitle={`Manage all ${customers.length} registered clients, service schedules, and appliances.`}
      headerActions={
        <div className="flex items-center gap-2">
          {/* Prominent Import Button */}
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-2xs transition-colors min-h-[38px]"
            title="Import customers from CSV file"
          >
            <Upload className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Top Controls: Segmented Tabs (Active vs Archived) + Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs
            tabs={directoryTabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as DirectoryTab)}
            variant="pill"
          />

          <div className="w-full md:w-80">
            <Input
              placeholder={activeTab === 'ACTIVE' ? 'Search customer, phone, locality...' : 'Search archived customers...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={Search}
              className="py-2"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: ACTIVE CUSTOMERS */}
        {/* ============================================================== */}
        {activeTab === 'ACTIVE' && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            {/* Desktop Table Header (Hidden on Mobile) */}
            <div className="hidden md:flex items-center justify-between px-6 py-3.5 bg-gray-50/70 border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="w-1/3">Customer</div>
              <div className="w-1/4">Appliance & Model</div>
              <div className="w-1/4">Next Due Date</div>
              <div className="w-36 text-right pr-2">Actions</div>
            </div>

            {/* Customer List Content */}
            <div className="divide-y divide-gray-100">
              {filteredActiveCustomers.length > 0 ? (
                filteredActiveCustomers.map((cust) => {
                  const custAssets = assets.filter((a) => a.customerId === cust.id);
                  const custServices = services.filter((s) => s.customerId === cust.id);
                  const latestService = custServices[0];
                  const primaryAsset = custAssets[0];
                  const dueInfo = latestService ? calculateDueStatus(latestService.nextDueDate) : null;
                  const addressSummary = formatAddressSummary(cust);
                  const mapsUrl = hasSufficientAddress(cust) ? getGoogleMapsSearchUrl(cust) : null;
                  const isMenuOpen = moreMenuCustomerId === cust.id;

                  return (
                    <div key={cust.id} className="transition-colors hover:bg-blue-50/10">
                      {/* -------------------------------------------------------- */}
                      {/* Mobile Card (< md) */}
                      {/* -------------------------------------------------------- */}
                      <div className="md:hidden p-4 space-y-3">
                        <div
                          className="flex items-start justify-between gap-2 cursor-pointer"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-gray-900 text-sm truncate hover:text-blue-600">
                                {cust.name}
                              </h4>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {cust.phone} {addressSummary && `• ${addressSummary}`}
                            </p>
                          </div>
                          {dueInfo && (
                            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
                          )}
                        </div>

                        {/* Appliance info snippet */}
                        <div className="flex items-center justify-between text-xs bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100">
                          <p className="font-medium text-gray-800 truncate">
                            {primaryAsset ? primaryAsset.name : 'No appliance listed'}
                            {custAssets.length > 1 && ` (+${custAssets.length - 1} more)`}
                          </p>
                          {dueInfo ? (
                            <span className="text-[11px] text-gray-600 font-semibold shrink-0">
                              Due: {dueInfo.formattedDue}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">No schedule</span>
                          )}
                        </div>

                        {/* Mobile Actions: Max 2 visible + More */}
                        <div className="flex items-center gap-2 pt-0.5">
                          {/* Visible Action 1: WhatsApp */}
                          <Button
                            variant="whatsapp"
                            size="md"
                            onClick={() =>
                              setActiveWhatsApp({
                                customer: cust,
                                asset: primaryAsset,
                                service: latestService,
                              })
                            }
                            leftIcon={MessageSquare}
                            className="flex-1 min-h-[44px]"
                          >
                            WhatsApp
                          </Button>

                          {/* Visible Action 2: Phone Call */}
                          <a
                            href={`tel:${cust.phone}`}
                            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors shrink-0 active:scale-95"
                            title={`Call ${cust.name}`}
                            aria-label={`Call ${cust.name}`}
                          >
                            <Phone className="w-4 h-4 text-gray-700" />
                          </a>

                          {/* More Trigger */}
                          <button
                            type="button"
                            onClick={() => setMoreMenuCustomerId(isMenuOpen ? null : cust.id)}
                            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors shrink-0 active:scale-95"
                            aria-label="More customer options"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        {/* Mobile More Drawer */}
                        {isMenuOpen && (
                          <div className="pt-2 pb-1 border-t border-gray-100 space-y-1 animate-slide-up text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setMoreMenuCustomerId(null);
                                setSelectedCustomer(cust);
                              }}
                              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-800 text-left min-h-[40px]"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                              <span>View / Edit Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyAddress(cust)}
                              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-800 text-left min-h-[40px]"
                            >
                              <Copy className="w-4 h-4 text-gray-500" />
                              <span>Copy Address</span>
                            </button>

                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-100 font-medium text-blue-600 text-left min-h-[40px]"
                              >
                                <Navigation className="w-4 h-4" />
                                <span>Open in Google Maps</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleArchiveCustomer(cust)}
                              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-red-50 font-medium text-red-600 text-left min-h-[40px]"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Archive Customer</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* -------------------------------------------------------- */}
                      {/* Desktop Row (≥ md) */}
                      {/* -------------------------------------------------------- */}
                      <div className="hidden md:flex items-center justify-between px-6 py-4">
                        {/* Customer Info */}
                        <div
                          className="w-1/3 min-w-0 pr-4 cursor-pointer group/name"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate group-hover/name:text-blue-600 transition-colors">
                              {cust.name}
                            </h4>
                            {latestService && <StatusBadge status={latestService.followUpStatus} />}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {cust.phone} • {addressSummary || cust.address || 'No address'}
                          </p>
                        </div>

                        {/* Appliance & Asset */}
                        <div className="w-1/4 min-w-0 pr-4">
                          {custAssets.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {primaryAsset.name} {primaryAsset.capacity ? `(${primaryAsset.capacity})` : ''}
                              </p>
                              {custAssets.length > 1 && (
                                <span className="text-[10px] text-blue-600 font-bold">
                                  +{custAssets.length - 1} more appliance
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No appliance added</span>
                          )}
                        </div>

                        {/* Next Due Date & Status */}
                        <div className="w-1/4 min-w-0 pr-4">
                          {dueInfo ? (
                            <div>
                              <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
                              <p className="text-[11px] text-gray-500 mt-1">
                                Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span>
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No active cycle</span>
                          )}
                        </div>

                        {/* Desktop Actions: Max 2 visible + More Dropdown */}
                        <div className="w-36 flex items-center justify-end gap-1.5 shrink-0 relative">
                          {/* Action 1: WhatsApp */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveWhatsApp({
                                customer: cust,
                                asset: primaryAsset,
                                service: latestService,
                              })
                            }
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center border border-gray-200/80"
                            title="WhatsApp Customer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Action 2: Phone Call */}
                          <a
                            href={`tel:${cust.phone}`}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center border border-gray-200/80"
                            title="Call Phone"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          {/* Desktop More Menu Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                setMoreMenuAnchorEl(e.currentTarget);
                                setMoreMenuCustomerId(isMenuOpen ? null : cust.id);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            <DropdownPortal
                                  isOpen={isMenuOpen}
                                  onClose={() => setMoreMenuCustomerId(null)}
                                  triggerRef={moreMenuAnchorEl}
                                  minWidth={192}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMoreMenuCustomerId(null);
                                      setSelectedCustomer(cust);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    <span>View / Edit Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMoreMenuCustomerId(null);
                                      handleCopyAddress(cust);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Copy Address</span>
                                  </button>

                                  {mapsUrl && (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setMoreMenuCustomerId(null)}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                                    >
                                      <Navigation className="w-3.5 h-3.5" />
                                      <span>Open in Google Maps</span>
                                    </a>
                                  )}

                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => handleArchiveCustomer(cust)}
                                    className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Archive Customer</span>
                                  </button>
                                </DropdownPortal>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : customers.length === 0 ? (
                /* No Customers Registered Empty State */
                <div className="p-6 sm:p-12">
                  <EmptyState
                    icon={Users}
                    title="No customers registered yet"
                    description="Add your first customer to track upcoming renewal cycles, or import an existing contact list from Excel/CSV."
                    primaryAction={{
                      label: 'Add Customer',
                      onClick: () => setShowAddModal(true),
                      icon: Plus,
                    }}
                    secondaryAction={{
                      label: 'Import CSV',
                      onClick: () => {
                        window.location.href = '/import';
                      },
                      icon: Upload,
                    }}
                  />
                </div>
              ) : (
                /* Search Not Found State */
                <div className="py-12 text-center text-gray-500 text-xs">
                  No customers found matching &quot;{search}&quot;.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ARCHIVED CUSTOMERS (With Restore Action) */}
        {/* ============================================================== */}
        {activeTab === 'ARCHIVED' && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                  Archived Customer Records
                </h3>
                <p className="text-[11px] text-gray-500">
                  Archived customers do not count towards active plan limits. Restore them anytime.
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredArchivedCustomers.length > 0 ? (
                filteredArchivedCustomers.map((cust) => {
                  const isRestoring = restoringId === cust.id;
                  const addressSummary = formatAddressSummary(cust);

                  return (
                    <div
                      key={cust.id}
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            {cust.name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                            Archived
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {cust.phone} {addressSummary && `• ${addressSummary}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={isRestoring}
                          onClick={() => handleRestoreCustomer(cust)}
                          leftIcon={RotateCcw}
                          className="min-h-[38px]"
                        >
                          Restore Customer
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 sm:p-12">
                  <EmptyState
                    icon={Archive}
                    title="No archived customers"
                    description="When you archive a customer, their record is preserved here safely without counting towards your active plan limit. You can restore them anytime."
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={Boolean(customerToArchive)}
        onClose={() => setCustomerToArchive(null)}
        title="Archive Customer"
        icon={<Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setCustomerToArchive(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmArchiveCustomer}
            >
              Archive Customer
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Are you sure you want to archive <strong className="text-slate-900 dark:text-white">{customerToArchive?.name}</strong>?
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <li>Active service schedules and upcoming reminders will be paused immediately.</li>
            <li>This customer will no longer appear in your active Today queue.</li>
            <li>All service history and contact records remain safe and can be restored anytime from the <strong className="text-slate-700 dark:text-slate-300">Archived</strong> tab.</li>
          </ul>
        </div>
      </Modal>

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
      />

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

      {/* Complete Service Dialog */}
      {activeComplete && (
        <CompleteServiceModal
          isOpen={true}
          onClose={() => setActiveComplete(null)}
          customer={activeComplete.customer}
          asset={activeComplete.asset}
          service={activeComplete.service}
        />
      )}
    </AppShell>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 bg-white rounded-2xl border border-gray-200" />
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  );
}
