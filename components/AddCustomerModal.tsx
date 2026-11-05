'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { calculateNextDueDate, formatIntervalDisplay } from '@/lib/due-date-engine';
import { IntervalUnit } from '@/lib/types';
import { getCategoryMetadata } from '@/lib/catalog-presets';
import { normalizePhoneNumber } from '@/lib/csv-import';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { HelpTip } from './ui/HelpTip';
import {
  UserPlus,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wrench,
  Check,
} from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const { addCustomer, business, catalog, customers } = useRenewalDesk();
  const categoryMeta = getCategoryMetadata(business?.industry);

  const sixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  };

  // Section 1: Basics
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState(sixMonthsAgo());

  const normalizedPhone = normalizePhoneNumber(phone);
  const existingCustomerMatch = normalizedPhone.length >= 10
    ? customers.find((c) => normalizePhoneNumber(c.phone) === normalizedPhone)
    : null;

  const activeCatalog = catalog.filter(c => c.isActive !== false);
  const defaultItem = activeCatalog[0] || catalog[0];

  const [serviceName, setServiceName] = useState(defaultItem?.name || categoryMeta.services[0]?.name || 'Periodic Routine Service');
  const [intervalValue, setIntervalValue] = useState(defaultItem?.intervalValue ?? categoryMeta.services[0]?.intervalValue ?? 6);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(defaultItem?.intervalUnit ?? categoryMeta.services[0]?.intervalUnit ?? 'MONTHS');
  const [nextDueDate, setNextDueDate] = useState(() =>
    calculateNextDueDate(sixMonthsAgo(), defaultItem?.intervalValue ?? categoryMeta.services[0]?.intervalValue ?? 6, defaultItem?.intervalUnit ?? categoryMeta.services[0]?.intervalUnit ?? 'MONTHS')
  );
  const [serviceAmount, setServiceAmount] = useState(defaultItem?.typicalPrice ?? categoryMeta.services[0]?.typicalPrice ?? 1200);

  // Section 2: More Details (Expandable)
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState(business?.city || '');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [assetName, setAssetName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await addCustomer(
        {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          locality: locality.trim() || undefined,
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          landmark: landmark.trim() || undefined,
        },
        {
          name: assetName.trim() || categoryMeta.assetLabel,
          capacity: capacity.trim(),
          location: location.trim(),
        },
        {
          serviceName: serviceName.trim(),
          lastServiceDate,
          nextDueDate,
          intervalMonths: intervalUnit === 'YEARS' ? intervalValue * 12 : (intervalUnit === 'DAYS' ? Math.max(1, Math.round(intervalValue / 30)) : intervalValue),
          intervalValue,
          intervalUnit,
          serviceAmount: Number(serviceAmount),
          followUpStatus: 'NOT_CONTACTED',
        }
      );

      if (res.success) {
        setName('');
        setPhone('');
        setAddress('');
        setLocality('');
        setCity(business?.city || '');
        setPincode('');
        setLandmark('');
        setAssetName('');
        setCapacity('');
        setLocation('');
        setShowMoreDetails(false);
        setSubmitError(null);
        onClose();
      } else {
        setSubmitError(res.error || 'Failed to save customer to cloud database.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      description="Record customer details and schedule their recurring service cycle."
      size="lg"
    >
      {/* Error Alert */}
      {submitError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-900">Unable to save customer</p>
            <p className="text-red-700 mt-0.5">{submitError}</p>
            {(submitError.toLowerCase().includes('capacity') ||
              submitError.toLowerCase().includes('limit') ||
              submitError.toLowerCase().includes('trial')) && (
              <div className="pt-2">
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs"
                >
                  <span>
                    {submitError.toLowerCase().includes('start')
                      ? 'Start 14-Day Free Trial'
                      : 'Upgrade Plan'}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ============================================================== */}
        {/* SECTION 1: BASICS (Visible First) */}
        {/* ============================================================== */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-100">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-black">1</span>
            <span>Customer & Service Basics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Customer Full Name"
              required
              placeholder="e.g. Anand Menon"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <Input
                label="Mobile / WhatsApp Number"
                required
                type="tel"
                placeholder="e.g. 9846011222"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="10-digit phone for 1-click WhatsApp reminders."
              />
              {existingCustomerMatch && (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    A customer with this phone number already exists (<strong>{existingCustomerMatch.name}</strong>). You can still proceed if this is a shared number or second appliance.
                  </span>
                </div>
              )}
            </div>

            <Select
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Service Type</span>
                  <HelpTip
                    title="Service Interval & Cadence"
                    content="Service interval defines how frequently maintenance should repeat (e.g. every 6 months). When you mark a service completed, RenewalDesk uses this cadence to auto-schedule the next due date."
                  />
                </span>
              }
              required
              value={serviceName}
              onChange={(e) => handleServiceTypeChange(e.target.value)}
              helperText={`Cadence: ${formatIntervalDisplay(intervalValue, intervalUnit)}`}
            >
              {activeCatalog.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({formatIntervalDisplay(c.intervalValue, c.intervalUnit)})
                </option>
              ))}
            </Select>

            <Input
              label="Last Service Date"
              type="date"
              value={lastServiceDate}
              onChange={(e) => handleLastDateChange(e.target.value)}
              helperText="Date appliance was last serviced."
            />

            <div className="sm:col-span-2">
              <Input
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <span>Next Due Date</span>
                    <HelpTip
                      title="Next Due Date"
                      content="Target date for upcoming service. When due, this customer will appear in your Today follow-up queue with 1-click WhatsApp reminders."
                    />
                  </span>
                }
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                helperText="Auto-calculated from service interval. Adjust manually if needed."
                className="font-semibold text-blue-900 bg-blue-50/30 border-blue-300"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 2: MORE DETAILS (Expandable Accordion) */}
        {/* ============================================================== */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors select-none min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[11px] font-black">2</span>
              <span>Additional Details (Address, Landmark, Model, Price)</span>
            </div>
            {showMoreDetails ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showMoreDetails && (
            <div className="pt-4 space-y-3.5 animate-slide-up">
              {/* Address Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Street Address / Flat / Building"
                    placeholder="e.g. Flat 4B, Skyline Ivy Apartments"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <Input
                  label="Locality / Area"
                  placeholder="e.g. Edappally"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                />

                <Input
                  label="Landmark"
                  placeholder="e.g. Near Metro Pillar 380"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />

                <Input
                  label="City / Town"
                  placeholder="e.g. Kochi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />

                <Input
                  label="PIN Code"
                  placeholder="e.g. 682024"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>

              {/* Appliance Specifics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div className="sm:col-span-2">
                  <Input
                    label={categoryMeta.assetLabel}
                    placeholder={categoryMeta.assetPlaceholder}
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                  />
                </div>

                <Input
                  label={categoryMeta.capacityLabel}
                  placeholder={categoryMeta.capacityPlaceholder}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />

                <div className="sm:col-span-2">
                  <Input
                    label="Premises Location"
                    placeholder="e.g. Master Bedroom / Office 2nd floor"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <Input
                  label={`Expected Fee (${business.currency})`}
                  type="number"
                  placeholder="1200"
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(Number(e.target.value))}
                />
              </div>

              {/* Quick Interval Adjusters */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Quick Interval:</span>
                {[
                  { val: 3, unit: 'MONTHS' as IntervalUnit, label: '3 Mos' },
                  { val: 6, unit: 'MONTHS' as IntervalUnit, label: '6 Mos' },
                  { val: 12, unit: 'MONTHS' as IntervalUnit, label: '1 Year' },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => handleIntervalChange(preset.val, preset.unit)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors min-h-[32px] ${
                      intervalValue === preset.val && intervalUnit === preset.unit
                        ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={!name.trim() || !phone.trim()}
          >
            Save Customer & Start Cycle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
