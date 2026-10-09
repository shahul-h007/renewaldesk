'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Asset, ServiceRecord, IntervalUnit } from '@/lib/types';
import { useRenewalDesk } from '@/lib/store';
import { calculateNextDueDate, formatReadableDate, formatIntervalDisplay } from '@/lib/due-date-engine';
import { CheckCircle2, X, Calendar, ArrowRight, Clock } from 'lucide-react';

interface CompleteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  asset?: Asset;
  service?: ServiceRecord;
}

export function CompleteServiceModal({ isOpen, onClose, customer, asset, service }: CompleteServiceModalProps) {
  const { markServiceCompleted, business, catalog } = useRenewalDesk();
  const todayStr = new Date().toISOString().split('T')[0];

  const [completedDate, setCompletedDate] = useState(todayStr);
  const [intervalValue, setIntervalValue] = useState(6);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('MONTHS');
  const [amountCollected, setAmountCollected] = useState(1200);

  // Sync state when service changes
  React.useEffect(() => {
    if (service) {
      const cat = catalog.find(c => c.name.toLowerCase() === service.serviceName.toLowerCase());
      const val = cat ? cat.intervalValue : (service.intervalValue ?? service.intervalMonths ?? 6);
      const unit = cat ? cat.intervalUnit : (service.intervalUnit ?? 'MONTHS');
      setIntervalValue(val);
      setIntervalUnit(unit);
      setAmountCollected(service.serviceAmount || cat?.typicalPrice || 1200);
      setCompletedDate(new Date().toISOString().split('T')[0]);
    }
  }, [service, catalog, isOpen]);

  if (!isOpen || !customer || !service) return null;

  const nextDueCalculated = calculateNextDueDate(completedDate, intervalValue, intervalUnit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markServiceCompleted(service.id, completedDate, Number(amountCollected), intervalValue, intervalUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Mark Service Completed</h2>
              <p className="text-xs text-gray-600">
                {customer.name} • {asset?.name || 'Appliance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Completion Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Service Completion Date
            </label>
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Amount Collected */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Amount Collected ({business.currency})
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-semibold">
                {business.currency}
              </span>
              <input
                type="number"
                value={amountCollected}
                onChange={(e) => setAmountCollected(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold"
                required
              />
            </div>
          </div>

          {/* Service Interval Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Next Service Cadence
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold"
              />
              <select
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
              >
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Recur in <strong className="text-blue-700">{formatIntervalDisplay(intervalValue, intervalUnit)}</strong>
            </p>
          </div>

          {/* The Magic Loop Callout Box */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Automatic Next Cycle Calculation</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <span className="text-gray-500 block">Completed</span>
                <span className="font-semibold text-gray-800">{formatReadableDate(completedDate)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-500" />
              <div className="text-right">
                <span className="text-emerald-600 font-bold block">Next Due Date</span>
                <span className="font-bold text-emerald-800 text-sm">{formatReadableDate(nextDueCalculated)}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 pt-1 leading-normal">
              RenewalDesk will automatically place this customer in your future follow-up queue when {formatReadableDate(nextDueCalculated)} approaches.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete & Auto-Schedule Next Cycle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
