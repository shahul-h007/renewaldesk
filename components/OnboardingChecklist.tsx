'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRenewalDesk } from '@/lib/store';
import {
  calculateChecklistProgress,
  isChecklistDismissed,
  setChecklistDismissed,
} from '@/lib/tour-config';
import {
  generateSampleClients,
  getSampleCustomerCount,
  isSampleCustomer,
} from '@/lib/sample-data';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  UserPlus,
  Upload,
  MessageSquare,
  CalendarCheck,
  Trash2,
  HelpCircle,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

interface OnboardingChecklistProps {
  onOpenAddCustomer: () => void;
  onStartTour: () => void;
  businessId?: string;
}

export function OnboardingChecklist({
  onOpenAddCustomer,
  onStartTour,
  businessId,
}: OnboardingChecklistProps) {
  const {
    customers,
    services,
    serviceHistory,
    business,
    addCustomer,
    deleteCustomer,
  } = useRenewalDesk();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [isRemovingSample, setIsRemovingSample] = useState(false);

  // Initialize dismissed state from storage safely
  useEffect(() => {
    setIsDismissed(isChecklistDismissed(businessId));
  }, [businessId]);

  const progress = calculateChecklistProgress(
    customers,
    services,
    serviceHistory
  );

  const sampleCount = getSampleCustomerCount(customers);

  // If all 3 steps are complete or user dismissed it, hide checklist
  if (progress.allCompleted || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setChecklistDismissed(businessId, true);
    setIsDismissed(true);
  };

  const handleLoadSampleData = async () => {
    setIsAddingSample(true);
    try {
      const sampleSeeds = generateSampleClients(business.industry);
      for (const sample of sampleSeeds) {
        await addCustomer(
          {
            name: sample.name,
            phone: sample.phone,
            address: sample.address,
            locality: sample.locality,
            city: sample.city,
          },
          {
            name: sample.assetName,
          },
          {
            serviceName: sample.serviceName,
            serviceAmount: sample.serviceAmount,
            lastServiceDate: sample.lastServiceDate,
            nextDueDate: sample.nextDueDate,
            intervalMonths: business.defaultIntervalMonths || 6,
            followUpStatus: 'NOT_CONTACTED',
          }
        );
      }
    } catch (err) {
      console.error('Failed to load sample data:', err);
    } finally {
      setIsAddingSample(false);
    }
  };

  const handleRemoveSampleData = async () => {
    setIsRemovingSample(true);
    try {
      const sampleCustomers = customers.filter(isSampleCustomer);
      for (const cust of sampleCustomers) {
        deleteCustomer(cust.id);
      }
    } catch (err) {
      console.error('Failed to remove sample data:', err);
    } finally {
      setIsRemovingSample(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white rounded-2xl border border-blue-200/90 shadow-2xs p-4 sm:p-5 relative overflow-hidden animate-fade-in">
      {/* Header with Title, Progress Bar, and Dismiss Button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>Getting Started</span>
            </span>
            <span className="text-xs font-bold text-gray-800">
              {progress.completedCount} of {progress.totalCount} completed ({progress.percentage}%)
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-snug">
            Set Up Your Recurring Service Workflow
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onStartTour}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-colors"
            title="Take interactive tour"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Take 1-Min Tour</span>
            <span className="sm:hidden">Tour</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden mb-4">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Checklist 3 Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Add First Customer */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            progress.hasCustomers
              ? 'bg-emerald-50/60 border-emerald-200/80'
              : 'bg-white border-blue-200 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {progress.hasCustomers ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold leading-tight ${progress.hasCustomers ? 'text-emerald-900 line-through' : 'text-gray-900'}`}>
                1. Add your first customer
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                {progress.hasCustomers
                  ? 'First customer saved with service schedule.'
                  : 'Add one customer or upload an Excel/CSV spreadsheet.'}
              </p>
              {!progress.hasCustomers && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onOpenAddCustomer}
                    leftIcon={UserPlus}
                    className="text-xs"
                  >
                    Add Customer
                  </Button>
                  <Link href="/import">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={Upload}
                      className="text-xs"
                    >
                      Import CSV
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Send First Reminder */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            progress.hasSentReminder
              ? 'bg-emerald-50/60 border-emerald-200/80'
              : 'bg-white border-blue-200 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {progress.hasSentReminder ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold leading-tight ${progress.hasSentReminder ? 'text-emerald-900 line-through' : 'text-gray-900'}`}>
                2. Send your first reminder
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                {progress.hasSentReminder
                  ? 'First reminder sent via WhatsApp click-to-chat.'
                  : 'Tap "WhatsApp" on any row to send a 1-click wa.me reminder.'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Mark Service Completed */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            progress.hasCompletedService
              ? 'bg-emerald-50/60 border-emerald-200/80'
              : 'bg-white border-blue-200 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {progress.hasCompletedService ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold leading-tight ${progress.hasCompletedService ? 'text-emerald-900 line-through' : 'text-gray-900'}`}>
                3. Mark first service completed
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                {progress.hasCompletedService
                  ? 'Service recorded and next due date scheduled automatically.'
                  : 'Logs collected fee and auto-schedules next maintenance date.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Optional: "Explore with sample data" for brand-new accounts */}
      {customers.length === 0 && (
        <div className="mt-3.5 pt-3 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-[11px] text-gray-600">
            Want to see how the follow-up queue works before adding real clients?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadSampleData}
            disabled={isAddingSample}
            leftIcon={isAddingSample ? RotateCw : Sparkles}
            className={`text-xs shrink-0 ${isAddingSample ? 'animate-pulse' : ''}`}
          >
            {isAddingSample ? 'Adding sample clients...' : 'Explore with 3 sample clients'}
          </Button>
        </div>
      )}

      {/* Sample Data Active Banner with 1-Tap Removal */}
      {sampleCount > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              You have <strong>{sampleCount} sample records</strong> in your account for testing.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveSampleData}
            disabled={isRemovingSample}
            leftIcon={Trash2}
            className="text-xs text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            {isRemovingSample ? 'Removing...' : 'Remove Sample Data'}
          </Button>
        </div>
      )}
    </div>
  );
}
