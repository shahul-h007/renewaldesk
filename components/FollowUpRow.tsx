'use client';

import React, { useState } from 'react';
import { Customer, Asset, ServiceRecord, FollowUpStatus } from '@/lib/types';
import { useRenewalDesk } from '@/lib/store';
import { calculateDueStatus, formatReadableDate } from '@/lib/due-date-engine';
import { UrgencyBadge, StatusBadge } from './Badge';
import { WhatsAppModal } from './WhatsAppModal';
import { CompleteServiceModal } from './CompleteServiceModal';
import { Phone, MessageSquare, CheckCircle2, Calendar, MoreVertical } from 'lucide-react';
import { formatINR } from '@/lib/format';

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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!customer) return null;

  const dueInfo = calculateDueStatus(service.nextDueDate);

  const handleStatusChange = (status: FollowUpStatus) => {
    setShowMenu(false);
    if (status === 'COMPLETED') {
      if (onOpenComplete) {
        onOpenComplete();
      } else {
        setShowCompleteModal(true);
      }
    } else {
      if (onUpdateStatus) {
        onUpdateStatus(status);
      } else {
        updateFollowUpStatus(service.id, status);
      }
    }
  };

  return (
    <>
      <div className="group relative bg-white hover:bg-blue-50/30 transition-all border-b border-gray-100 last:border-b-0 p-4 sm:px-6 sm:py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Column 1: Customer Identity */}
        <div className="min-w-0 sm:w-1/4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {customer.name}
            </h4>
            <StatusBadge status={service.followUpStatus} />
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {customer.phone} {customer.locality ? `• ${customer.locality}` : ''}
          </p>
        </div>

        {/* Column 2: Appliance / Asset */}
        <div className="sm:w-1/5 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">
            {asset?.name || 'Air Conditioner'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {service.serviceName}
          </p>
        </div>

        {/* Column 3: Urgency & Due Date */}
        <div className="sm:w-1/5 min-w-0">
          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span>
          </p>
        </div>

        {/* Column 4: Expected Revenue */}
        <div className="sm:w-24 text-left sm:text-right">
          <span className="text-xs text-gray-400 sm:hidden">Expected: </span>
          <span suppressHydrationWarning className="text-sm font-bold text-gray-900">
            {business.currency}{formatINR(service.serviceAmount)}
          </span>
        </div>

        {/* Column 5: Action Cluster */}
        <div className="flex items-center gap-2 sm:justify-end">
          {/* WhatsApp Primary Action */}
          <button
            onClick={() => (onOpenWhatsApp ? onOpenWhatsApp() : setShowWhatsAppModal(true))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] shadow-sm transition-all"
            title="Open WhatsApp message preview"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Direct Phone Call */}
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
            title="Call Customer"
          >
            <Phone className="w-3.5 h-3.5 text-gray-600" />
          </a>

          {/* Quick Booking Confirmation */}
          {service.followUpStatus !== 'BOOKED' && service.followUpStatus !== 'COMPLETED' && (
            <button
              onClick={() => handleStatusChange('BOOKED')}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              title="Mark as Booked"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Booked</span>
            </button>
          )}

          {/* Complete Service & Reschedule */}
          {service.followUpStatus !== 'COMPLETED' && (
            <button
              onClick={() => (onOpenComplete ? onOpenComplete() : setShowCompleteModal(true))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Mark service completed and calculate next due date"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Completed</span>
            </button>
          )}

          {/* More Status Options */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 text-xs text-gray-700">
                  <div className="px-3 py-1 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                    Update Status
                  </div>
                  <button
                    onClick={() => handleStatusChange('CONTACTED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Mark Contacted</span>
                    {service.followUpStatus === 'CONTACTED' && <span className="text-blue-600">✓</span>}
                  </button>
                  <button
                    onClick={() => handleStatusChange('REPLIED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Customer Replied</span>
                    {service.followUpStatus === 'REPLIED' && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => handleStatusChange('BOOKED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Mark Booked</span>
                    {service.followUpStatus === 'BOOKED' && <span className="text-indigo-600">✓</span>}
                  </button>
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-between"
                  >
                    <span>Mark Completed</span>
                    {service.followUpStatus === 'COMPLETED' && <span>✓</span>}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => handleStatusChange('NO_RESPONSE')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-500"
                  >
                    No Response
                  </button>
                  <button
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
    </>
  );
}
