import React from 'react';
import { ServiceUrgency, FollowUpStatus } from '@/lib/types';
import { AlertCircle, Clock, Calendar, CheckCircle2, MessageSquare, X } from 'lucide-react';

interface UrgencyBadgeProps {
  urgency: ServiceUrgency;
  customLabel?: string;
}

export function UrgencyBadge({ urgency, customLabel }: UrgencyBadgeProps) {
  switch (urgency) {
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          {customLabel || 'Overdue'}
        </span>
      );
    case 'DUE_TODAY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          {customLabel || 'Due Today'}
        </span>
      );
    case 'DUE_THIS_WEEK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Calendar className="w-3.5 h-3.5 text-amber-700" />
          {customLabel || 'Due This Week'}
        </span>
      );
    case 'DUE_THIS_MONTH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          {customLabel || 'Due This Month'}
        </span>
      );
    case 'FUTURE':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {customLabel || 'Future Cycle'}
        </span>
      );
  }
}

interface StatusBadgeProps {
  status: FollowUpStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'NOT_CONTACTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
          Not Contacted
        </span>
      );
    case 'CONTACTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
          <MessageSquare className="w-3 h-3" />
          Contacted
        </span>
      );
    case 'REPLIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
          Replied
        </span>
      );
    case 'BOOKED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
          <Calendar className="w-3 h-3" />
          Booked
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    case 'NOT_INTERESTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
          <X className="w-3 h-3" />
          Not Interested
        </span>
      );
    case 'NO_RESPONSE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700">
          No Response
        </span>
      );
  }
}
