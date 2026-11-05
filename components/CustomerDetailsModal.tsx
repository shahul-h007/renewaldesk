'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Asset, ServiceRecord } from '@/lib/types';
import { useRenewalDesk } from '@/lib/store';
import {
  formatCustomerAddress,
  hasSufficientAddress,
  getGoogleMapsSearchUrl,
  copyToClipboard,
} from '@/lib/address-utils';
import { UrgencyBadge, StatusBadge } from '@/components/Badge';
import { calculateDueStatus, formatReadableDate } from '@/lib/due-date-engine';
import { formatINR } from '@/lib/format';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Save,
  AlertCircle,
  Wrench,
  Calendar,
  Building,
  Navigation,
} from 'lucide-react';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated?: (updated: Customer) => void;
}

export function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: CustomerDetailsModalProps) {
  const { assets, services, updateCustomer, business } = useRenewalDesk();
  const toast = useToast();

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');

  // Copy feedback state
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // Save feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronize state when customer changes
  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setLocality(customer.locality || '');
      setCity(customer.city || '');
      setPincode(customer.pincode || '');
      setLandmark(customer.landmark || '');
      setNotes(customer.notes || '');
      setIsEditing(false);
      setCopyStatus('idle');
      setSaveError(null);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const custAssets = assets.filter(a => a.customerId === customer.id);
  const custServices = services.filter(s => s.customerId === customer.id);

  const formattedAddress = formatCustomerAddress(customer);
  const canOpenInMaps = hasSufficientAddress(customer);
  const mapsUrl = getGoogleMapsSearchUrl(customer);

  const handleCopyAddress = async () => {
    if (!formattedAddress) {
      toast.warning('No address details recorded for this customer.');
      return;
    }

    const result = await copyToClipboard(formattedAddress);
    if (result.success) {
      setCopyStatus('copied');
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } else {
      toast.error(result.error || 'Clipboard copy failed.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedCust: Customer = {
        ...customer,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        locality: locality.trim() || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
        landmark: landmark.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      updateCustomer(updatedCust);
      if (onCustomerUpdated) {
        onCustomerUpdated(updatedCust);
      }
      setIsEditing(false);
      toast.success('Customer details updated successfully!');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update customer details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      description={`Customer registered on ${customer.createdAt}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Save Error Alert */}
        {saveError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Failed to save changes</p>
              <p className="text-red-700 mt-0.5">{saveError}</p>
            </div>
          </div>
        )}

        {isEditing ? (
          /* ============================================================== */
          /* EDIT MODE FORM */
          /* ============================================================== */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Customer Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Phone Number"
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Street / Flat / House"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 4B, Skyline Ivy Apartments"
                />
              </div>

              <Input
                label="Locality / Area"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Edappally"
              />

              <Input
                label="Landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Metro Pillar 380"
              />

              <Input
                label="City / Town"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kochi"
              />

              <Input
                label="PIN Code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 682024"
              />

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Customer prefers morning service before 11 AM"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={Save}
              >
                Save Details
              </Button>
            </div>
          </form>
        ) : (
          /* ============================================================== */
          /* VIEW MODE */
          /* ============================================================== */
          <div className="space-y-5">
            {/* Quick Contact & Address Card */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Contact Phone</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{customer.phone}</p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs min-h-[36px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Call</span>
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    leftIcon={Edit2}
                    className="min-h-[36px]"
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {/* Full Address Block */}
              <div className="pt-3 border-t border-gray-200/60">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Service Address</span>
                  </p>

                  <div className="flex items-center gap-1.5">
                    {formattedAddress && (
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                      >
                        {copyStatus === 'copied' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    {canOpenInMaps && mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Maps</span>
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-800 leading-relaxed font-medium">
                  {formattedAddress || (
                    <span className="text-gray-400 italic">No address provided</span>
                  )}
                </p>
              </div>

              {customer.notes && (
                <div className="pt-2 border-t border-gray-200/60 text-xs">
                  <span className="text-gray-400 font-semibold block mb-0.5">Notes:</span>
                  <p className="text-gray-700">{customer.notes}</p>
                </div>
              )}
            </div>

            {/* Registered Appliances & Service Cycles */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                <span>Appliances & Service Cadence ({custAssets.length})</span>
              </h4>

              {custAssets.length > 0 ? (
                <div className="space-y-2">
                  {custAssets.map((asset) => {
                    const assetService = custServices.find((s) => s.assetId === asset.id) || custServices[0];
                    const dueInfo = assetService ? calculateDueStatus(assetService.nextDueDate) : null;

                    return (
                      <div
                        key={asset.id}
                        className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {asset.name} {asset.capacity && `(${asset.capacity})`}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {assetService?.serviceName || 'Periodic Maintenance'}
                            {asset.location && ` • ${asset.location}`}
                          </p>
                        </div>

                        {dueInfo && (
                          <div className="flex items-center gap-2">
                            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
                            <span className="text-xs font-semibold text-gray-700">
                              Due: {dueInfo.formattedDue}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">
                  No registered appliances.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <Button variant="outline" size="md" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
