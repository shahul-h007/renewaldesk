'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { calculateNextDueDate, formatIntervalDisplay } from '@/lib/due-date-engine';
import { IntervalUnit } from '@/lib/types';
import { X, UserPlus, Sparkles, Clock } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const { addCustomer, business, catalog } = useRenewalDesk();

  const todayStr = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  };

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('Kochi');

  const [assetName, setAssetName] = useState('Samsung Split AC');
  const [capacity, setCapacity] = useState('1.5 Ton');
  const [location, setLocation] = useState('Master Bedroom');

  const activeCatalog = catalog.filter(c => c.isActive !== false);
  const defaultItem = activeCatalog[0] || catalog[0];

  const [serviceName, setServiceName] = useState(defaultItem?.name || 'AC Periodic General Service');
  const [intervalValue, setIntervalValue] = useState(defaultItem?.intervalValue ?? 6);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(defaultItem?.intervalUnit ?? 'MONTHS');
  const [lastServiceDate, setLastServiceDate] = useState(sixMonthsAgo());
  const [nextDueDate, setNextDueDate] = useState(() => calculateNextDueDate(sixMonthsAgo(), defaultItem?.intervalValue ?? 6, defaultItem?.intervalUnit ?? 'MONTHS'));
  const [serviceAmount, setServiceAmount] = useState(defaultItem?.typicalPrice ?? 1200);

  if (!isOpen) return null;

  const handleServiceTypeChange = (selectedName: string) => {
    setServiceName(selectedName);
    const item = catalog.find(c => c.name === selectedName);
    if (item) {
      setServiceAmount(item.typicalPrice);
      setIntervalValue(item.intervalValue);
      setIntervalUnit(item.intervalUnit);
      if (lastServiceDate) {
        setNextDueDate(calculateNextDueDate(lastServiceDate, item.intervalValue, item.intervalUnit));
      }
    }
  };

  const handleLastDateChange = (val: string) => {
    setLastServiceDate(val);
    const autoNext = calculateNextDueDate(val, intervalValue, intervalUnit);
    setNextDueDate(autoNext);
  };

  const handleIntervalChange = (val: number, unit: IntervalUnit = intervalUnit) => {
    setIntervalValue(val);
    setIntervalUnit(unit);
    if (lastServiceDate) {
      setNextDueDate(calculateNextDueDate(lastServiceDate, val, unit));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    addCustomer(
      {
        name,
        phone,
        address,
        locality,
      },
      {
        name: assetName,
        capacity,
        location,
      },
      {
        serviceName,
        lastServiceDate,
        nextDueDate,
        intervalMonths: intervalUnit === 'YEARS' ? intervalValue * 12 : (intervalUnit === 'DAYS' ? Math.max(1, Math.round(intervalValue / 30)) : intervalValue),
        intervalValue,
        intervalUnit,
        serviceAmount: Number(serviceAmount),
        followUpStatus: 'NOT_CONTACTED',
      }
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add New Customer</h2>
              <p className="text-xs text-gray-500">Record customer details, appliance, and service cycle</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Section 1: Customer Details */}
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>1. Customer Information</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9846012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Locality / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 4B, Edappally, Kochi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Appliance / Asset */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">
              2. Appliance / Asset
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Appliance Name & Model</label>
                <input
                  type="text"
                  placeholder="e.g. Samsung Inverter Split AC"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="text"
                  placeholder="e.g. 1.5 Ton"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Service Cycle & Due Date */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">
              3. Service Cycle & Due Date
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Service Type *</label>
                <select
                  value={serviceName}
                  onChange={(e) => handleServiceTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
                >
                  {activeCatalog.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({formatIntervalDisplay(c.intervalValue, c.intervalUnit)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  Cadence: {formatIntervalDisplay(intervalValue, intervalUnit)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expected Fee ({business.currency})
                </label>
                <input
                  type="number"
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Service Date</label>
                <input
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => handleLastDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Next Due Date *</label>
                <input
                  type="date"
                  required
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-400 bg-blue-50/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-blue-950"
                />
              </div>
            </div>

            {/* Quick interval presets */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-gray-500">Quick adjust:</span>
              {[
                { val: 3, unit: 'MONTHS' as IntervalUnit, label: '3 Mos' },
                { val: 6, unit: 'MONTHS' as IntervalUnit, label: '6 Mos' },
                { val: 12, unit: 'MONTHS' as IntervalUnit, label: '1 Year' },
              ].map(preset => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => handleIntervalChange(preset.val, preset.unit)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    intervalValue === preset.val && intervalUnit === preset.unit
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              Save Customer & Start Cycle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
