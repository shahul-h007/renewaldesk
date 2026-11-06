'use client';

import React, { useState } from 'react';
import { Customer, Asset, ServiceRecord, FollowUpStatus } from '@/lib/types';
import { useRenewalDesk } from '@/lib/store';
import { calculateDueStatus } from '@/lib/due-date-engine';
import { UrgencyBadge, StatusBadge } from './Badge';
import { WhatsAppModal } from './WhatsAppModal';
import { CompleteServiceModal } from './CompleteServiceModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useTutorial } from './TutorialContext';
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Calendar,
  MoreVertical,
  User,
  MapPin,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import { formatAddressSummary, formatCustomerAddress, getGoogleMapsSearchUrl, hasSufficientAddress } from '@/lib/address-utils';

interface FollowUpRowProps {
  service: ServiceRecord;
  customer?: Customer;
  asset?: Asset;
  onUpdateStatus?: (status: FollowUpStatus) => void;
  onOpenWhatsApp?: () => void;
  onOpenComplete?: () => void;
}

export function FollowUpRow({
  service,
  customer,
  asset,
  onUpdateStatus,
  onOpenWhatsApp,
  onOpenComplete,
}: FollowUpRowProps) {
  const { updateFollowUpStatus, business } = useRenewalDesk();
  const { state: tutorialState, advance: advanceTutorial } = useTutorial();
  const toast = useToast();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!customer) return null;

  const isPracticeCustomer =
    tutorialState.isActive &&
    (tutorialState.practiceCustomerId
      ? customer.id === tutorialState.practiceCustomerId
      : true);

  const dueInfo = calculateDueStatus(service.nextDueDate);
  const status = service.followUpStatus;

  const handleStatusChange = (newStatus: FollowUpStatus) => {
    setShowMoreMenu(false);

    if (isPracticeCustomer && tutorialState.isActive && tutorialState.currentLesson === 4) {
      if (newStatus === 'NO_RESPONSE' && tutorialState.currentStep === 0) {
        advanceTutorial();
      } else if (newStatus === 'REPLIED' && tutorialState.currentStep === 2) {
        advanceTutorial();
      } else if (newStatus === 'BOOKED' && tutorialState.currentStep === 3) {
        advanceTutorial();
      }
    }

    if (newStatus === 'COMPLETED') {
      // Completed is excluded from automatic undo toast because it has its own dedicated modal flow
      if (onOpenComplete) {
        onOpenComplete();
      } else {
        setShowCompleteModal(true);
      }
    } else {
      const previousStatus = service.followUpStatus;
      if (onUpdateStatus) {
        onUpdateStatus(newStatus);
      } else {
        updateFollowUpStatus(service.id, newStatus);
      }

      const statusLabels: Record<FollowUpStatus, string> = {
        NOT_CONTACTED: 'Not Contacted',
        CONTACTED: 'Contacted',
        REPLIED: 'Customer Replied',
        BOOKED: 'Booked',
        COMPLETED: 'Completed',
        NO_RESPONSE: 'No Response',
        NOT_INTERESTED: 'Not Interested',
      };

      try {
        toast.undo(
          `${customer.name} marked as ${statusLabels[newStatus] || newStatus}`,
          () => {
            if (onUpdateStatus) onUpdateStatus(previousStatus);
            else updateFollowUpStatus(service.id, previousStatus);

            if (isPracticeCustomer && tutorialState.isActive && tutorialState.currentLesson === 4 && tutorialState.currentStep === 1) {
              advanceTutorial();
            }
          },
          'Status Updated',
          5000
        );
      } catch {
        // Fallback gracefully if used in non-toast contexts
      }
    }
  };

  const handlePrimaryAction = () => {
    if (status === 'NOT_CONTACTED' || !status) {
      if (isPracticeCustomer && tutorialState.isActive && tutorialState.currentLesson === 3 && tutorialState.currentStep === 0) {
        advanceTutorial();
      }
      if (onOpenWhatsApp) onOpenWhatsApp();
      else setShowWhatsAppModal(true);
    } else if (status === 'CONTACTED' || status === 'REPLIED' || status === 'NO_RESPONSE') {
      if (isPracticeCustomer && tutorialState.isActive && tutorialState.currentLesson === 4 && tutorialState.currentStep === 3) {
        advanceTutorial();
      }
      handleStatusChange('BOOKED');
    } else if (status === 'BOOKED') {
      if (onOpenComplete) onOpenComplete();
      else setShowCompleteModal(true);
    } else if (status === 'COMPLETED') {
      setShowDetailsModal(true);
    }
  };

  const addressSummary = formatAddressSummary(customer);
  const fullAddress = formatCustomerAddress(customer);
  const mapsUrl = hasSufficientAddress(customer) ? getGoogleMapsSearchUrl(customer) : null;

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE VIEW (< md): Touch-optimized Card */}
      {/* ============================================================== */}
      <div
        data-tutorial={isPracticeCustomer ? 'practice-customer-card' : undefined}
        className="md:hidden bg-white p-4 border-b border-gray-100 last:border-b-0 space-y-3 transition-colors hover:bg-gray-50/60"
      >
        {/* Top Header: Customer Name & Urgency Pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="text-left font-bold text-gray-900 text-sm truncate hover:text-blue-600 flex items-center gap-1.5"
            >
              <span className="truncate">{customer.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {customer.phone} {addressSummary && `• ${addressSummary}`}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
          </div>
        </div>

        {/* Middle Context: Appliance, Service, Due Date & Fee */}
        <div className="flex items-center justify-between text-xs bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100">
          <div className="min-w-0 pr-2">
            <p className="font-semibold text-gray-800 truncate">
              {asset?.name || 'Appliance'} • {service.serviceName}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span suppressHydrationWarning className="font-extrabold text-sm text-gray-900">
              {business.currency}{formatINR(service.serviceAmount)}
            </span>
            <div className="mt-0.5">
              <StatusBadge status={service.followUpStatus} />
            </div>
          </div>
        </div>

        {/* Mobile Action Footer: ONE primary button + Call + More */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Primary Button by Status */}
          {status === 'NOT_CONTACTED' || !status ? (
            <Button
              variant="whatsapp"
              size="md"
              onClick={handlePrimaryAction}
              leftIcon={MessageSquare}
              data-tutorial={isPracticeCustomer ? 'whatsapp-btn' : undefined}
              data-tour="tour-whatsapp-action"
              className="flex-1 min-h-[44px]"
            >
              WhatsApp
            </Button>
          ) : status === 'CONTACTED' || status === 'REPLIED' || status === 'NO_RESPONSE' ? (
            <Button
              variant="primary"
              size="md"
              onClick={handlePrimaryAction}
              leftIcon={Calendar}
              data-tutorial={isPracticeCustomer ? 'mark-booked-btn' : undefined}
              className="flex-1 min-h-[44px]"
            >
              Mark booked
            </Button>
          ) : status === 'BOOKED' ? (
            <Button
              variant="success"
              size="md"
              onClick={handlePrimaryAction}
              leftIcon={CheckCircle2}
              data-tutorial={isPracticeCustomer ? 'mark-completed-btn' : undefined}
              data-tour="tour-complete-action"
              className="flex-1 min-h-[44px]"
            >
              Mark completed
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={handlePrimaryAction}
              leftIcon={CheckCircle2}
              data-tour="tour-complete-action"
              className="flex-1 min-h-[44px] text-emerald-700 border-emerald-200 bg-emerald-50"
            >
              Completed
            </Button>
          )}

          {/* Direct Phone Call Button */}
          <a
            href={`tel:${customer.phone}`}
            aria-label={`Call ${customer.name}`}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors shrink-0 active:scale-95"
            title="Call phone"
          >
            <Phone className="w-4 h-4 text-gray-700" />
          </a>

          {/* More Actions Trigger */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            data-tutorial={isPracticeCustomer ? 'more-menu-btn' : undefined}
            aria-label="More actions"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors shrink-0 active:scale-95"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (≥ md): Compact Row with Proximity Actions */}
      {/* ============================================================== */}
      <div
        data-tutorial={isPracticeCustomer ? 'practice-customer-card' : undefined}
        className="hidden md:flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/20 transition-colors group"
      >
        {/* Customer Identity */}
        <div className="w-1/4 min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="font-bold text-gray-900 text-xs sm:text-sm truncate hover:text-blue-600 transition-colors text-left"
              title="Click to view/edit customer details"
            >
              {customer.name}
            </button>
            <StatusBadge status={service.followUpStatus} />
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5" title={fullAddress || customer.phone}>
            {customer.phone} {addressSummary ? `• ${addressSummary}` : (customer.address ? `• ${customer.address}` : '')}
          </p>
        </div>

        {/* Appliance & Service */}
        <div className="w-1/5 min-w-0 pr-3">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {asset?.name || 'Air Conditioner'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {service.serviceName}
          </p>
        </div>

        {/* Due Date & Urgency */}
        <div className="w-1/6 min-w-0 pr-3">
          <div className="flex items-center gap-1.5">
            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span>
          </p>
        </div>

        {/* Expected Fee */}
        <div className="w-20 text-right pr-4">
          <span suppressHydrationWarning className="text-sm font-extrabold text-gray-900">
            {business.currency}{formatINR(service.serviceAmount)}
          </span>
        </div>

        {/* Proximity Action Cluster: directly beside the customer info */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action Button (dynamically adapts to status) */}
          {status === 'NOT_CONTACTED' || !status ? (
            <Button
              variant="whatsapp"
              size="sm"
              onClick={handlePrimaryAction}
              leftIcon={MessageSquare}
              data-tutorial={isPracticeCustomer ? 'whatsapp-btn' : undefined}
              data-tour="tour-whatsapp-action"
              className="min-h-[36px]"
            >
              WhatsApp
            </Button>
          ) : status === 'CONTACTED' || status === 'REPLIED' || status === 'NO_RESPONSE' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrimaryAction}
              leftIcon={Calendar}
              data-tutorial={isPracticeCustomer ? 'mark-booked-btn' : undefined}
              className="min-h-[36px]"
            >
              Mark booked
            </Button>
          ) : status === 'BOOKED' ? (
            <Button
              variant="success"
              size="sm"
              onClick={handlePrimaryAction}
              leftIcon={CheckCircle2}
              data-tutorial={isPracticeCustomer ? 'mark-completed-btn' : undefined}
              data-tour="tour-complete-action"
              className="min-h-[36px]"
            >
              Mark completed
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrimaryAction}
              leftIcon={CheckCircle2}
              data-tour="tour-complete-action"
              className="min-h-[36px] text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            >
              Completed
            </Button>
          )}

          {/* Quick Call Button */}
          <a
            href={`tel:${customer.phone}`}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center border border-gray-200/60"
            title={`Call ${customer.name}`}
            aria-label={`Call ${customer.name}`}
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          {/* Desktop More Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              data-tutorial={isPracticeCustomer ? 'more-menu-btn' : undefined}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="More actions"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Desktop Dropdown */}
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-10 z-40 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 text-xs text-gray-700 animate-slide-up">
                  <div className="px-3 py-1 font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                    Customer Details
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDetailsModal(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>View / Edit Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (onOpenWhatsApp) onOpenWhatsApp();
                      else setShowWhatsAppModal(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Preview</span>
                  </button>

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Open in Google Maps</span>
                    </a>
                  )}

                  <div className="border-t border-gray-100 my-1" />
                  <div className="px-3 py-1 font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                    Change Status
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('NOT_CONTACTED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Not Contacted</span>
                    {status === 'NOT_CONTACTED' && <span className="text-gray-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('CONTACTED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Contacted</span>
                    {status === 'CONTACTED' && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('REPLIED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Customer Replied</span>
                    {status === 'REPLIED' && <span className="text-purple-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('BOOKED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Booked</span>
                    {status === 'BOOKED' && <span className="text-indigo-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('COMPLETED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-between"
                  >
                    <span>Completed</span>
                    {status === 'COMPLETED' && <span className="font-bold">✓</span>}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => handleStatusChange('NO_RESPONSE')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-500"
                  >
                    No Response
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('NOT_INTERESTED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-500"
                  >
                    Not Interested
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE MORE ACTIONS BOTTOM SHEET / MODAL */}
      {/* ============================================================== */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-5 pb-safe z-10 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{customer.name}</h3>
                <p className="text-xs text-gray-500">{customer.phone}</p>
              </div>
              <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowDetailsModal(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-800 text-left min-h-[44px]"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>View / Edit Customer Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onOpenWhatsApp) onOpenWhatsApp();
                  else setShowWhatsAppModal(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-800 text-left min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span>Open WhatsApp Preview</span>
              </button>

              <a
                href={`tel:${customer.phone}`}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 text-xs font-semibold text-gray-800 text-left min-h-[44px]"
              >
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Call Phone ({customer.phone})</span>
              </a>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 text-xs font-semibold text-blue-600 text-left min-h-[44px]"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Open Address in Google Maps</span>
                </a>
              )}
            </div>

            {/* Change Status Section */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Update Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('NOT_CONTACTED')}
                  className={`p-2.5 rounded-xl border text-xs font-medium min-h-[44px] flex items-center justify-center ${
                    status === 'NOT_CONTACTED' ? 'bg-gray-100 border-gray-400 font-bold text-gray-900' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Not Contacted
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('CONTACTED')}
                  className={`p-2.5 rounded-xl border text-xs font-medium min-h-[44px] flex items-center justify-center ${
                    status === 'CONTACTED' ? 'bg-blue-50 border-blue-400 font-bold text-blue-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Contacted
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('REPLIED')}
                  className={`p-2.5 rounded-xl border text-xs font-medium min-h-[44px] flex items-center justify-center ${
                    status === 'REPLIED' ? 'bg-purple-50 border-purple-400 font-bold text-purple-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Customer Replied
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('BOOKED')}
                  className={`p-2.5 rounded-xl border text-xs font-medium min-h-[44px] flex items-center justify-center ${
                    status === 'BOOKED' ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Booked
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleStatusChange('COMPLETED')}
                className="w-full mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark Completed & Set Next Due Date</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowMoreMenu(false)}
              className="w-full mt-4 py-3 rounded-xl bg-gray-100 font-semibold text-xs text-gray-700 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {!onOpenWhatsApp && (
        <WhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          customer={customer}
          asset={asset}
          service={service}
        />
      )}

      {/* Complete Service Dialog */}
      {!onOpenComplete && (
        <CompleteServiceModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          customer={customer}
          asset={asset}
          service={service}
        />
      )}

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        customer={customer}
      />
    </>
  );
}
