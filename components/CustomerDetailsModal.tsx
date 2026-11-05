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
import {
  X,
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
  const [copyError, setCopyError] = useState<string | null>(null);
  const [showManualCopy, setShowManualCopy] = useState(false);

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
      setCopyError(null);
      setShowManualCopy(false);
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
      setCopyStatus('error');
      setCopyError('No address details recorded for this customer.');
      return;
    }

    setCopyError(null);
    const result = await copyToClipboard(formattedAddress);
    if (result.success) {
      setCopyStatus('copied');
      setShowManualCopy(false);
      setTimeout(() => setCopyStatus('idle'), 2500);
    } else {
      setCopyStatus('error');
      setCopyError(result.error || 'Clipboard copy failed. Use manual copy below.');
      setShowManualCopy(true);
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
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update customer details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{customer.name}</h2>
                <span className="text-[11px] text-gray-500 font-normal">
                  Added on {customer.createdAt}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <span>{customer.phone}</span>
                {customer.email && <span>• {customer.email}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition-colors"
                title="Edit customer details & address"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
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
            /* Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Customer Address</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Street / Flat / House <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Flat 4B, SkyLine Ivy"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Locality / Area <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g. Edappally"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Landmark <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Lulu Mall"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      City / Town <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Kochi"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      PIN Code <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 682024"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes / Instructions <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Gate code 1234, call before arriving"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <>
              {/* Address Card */}
              <div className="bg-gray-50/75 border border-gray-200/80 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Address</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {/* Copy Address Button */}
                    <button
                      onClick={handleCopyAddress}
                      disabled={!formattedAddress}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 shadow-2xs transition-colors"
                      title={formattedAddress ? 'Copy formatted address to clipboard' : 'No address to copy'}
                    >
                      {copyStatus === 'copied' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>

                    {/* Open in Maps Button */}
                    {canOpenInMaps && mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 shadow-2xs transition-colors"
                        title="Open in Google Maps in a new tab"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Open in Maps</span>
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                        title="Add address, locality, or city to open in Google Maps"
                      >
                        <Navigation className="w-3.5 h-3.5 text-gray-400" />
                        <span>Open in Maps</span>
                      </span>
                    )}
                  </div>
                </div>

                {formattedAddress ? (
                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p className="font-medium text-gray-900 leading-relaxed text-sm">
                      {formattedAddress}
                    </p>
                    {/* Detailed address tags if available */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-gray-500">
                      {customer.locality && (
                        <span className="px-2 py-0.5 rounded bg-white border border-gray-200">
                          Locality: <strong className="text-gray-700">{customer.locality}</strong>
                        </span>
                      )}
                      {customer.landmark && (
                        <span className="px-2 py-0.5 rounded bg-white border border-gray-200">
                          Landmark: <strong className="text-gray-700">{customer.landmark}</strong>
                        </span>
                      )}
                      {customer.city && (
                        <span className="px-2 py-0.5 rounded bg-white border border-gray-200">
                          City: <strong className="text-gray-700">{customer.city}</strong>
                        </span>
                      )}
                      {customer.pincode && (
                        <span className="px-2 py-0.5 rounded bg-white border border-gray-200">
                          PIN: <strong className="text-gray-700">{customer.pincode}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic py-1">
                    No address saved. Click &quot;Edit&quot; above to add an address, locality, or landmark.
                  </div>
                )}

                {/* Manual copy fallback if clipboard API was blocked */}
                {showManualCopy && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
                    <p className="font-semibold text-amber-900">
                      Browser clipboard access was denied. You can select and copy the address below:
                    </p>
                    <textarea
                      readOnly
                      rows={2}
                      value={formattedAddress}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      className="w-full p-2 bg-white border border-amber-300 rounded text-gray-800 font-mono text-xs outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Customer Notes */}
              {customer.notes && (
                <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs">
                  <span className="font-semibold text-gray-700">Notes:</span>{' '}
                  <span className="text-gray-600">{customer.notes}</span>
                </div>
              )}

              {/* Appliances & Assets */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Registered Appliances ({custAssets.length})</span>
                </h4>
                {custAssets.length > 0 ? (
                  <div className="space-y-2">
                    {custAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">
                            {asset.name} {asset.capacity ? `(${asset.capacity})` : ''}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {asset.model ? `Model: ${asset.model}` : ''}
                            {asset.location ? ` • Location: ${asset.location}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No appliances listed.</p>
                )}
              </div>

              {/* Service Schedules */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Service Schedules ({custServices.length})</span>
                </h4>
                {custServices.length > 0 ? (
                  <div className="space-y-2">
                    {custServices.map(service => {
                      const dueInfo = calculateDueStatus(service.nextDueDate);
                      return (
                        <div
                          key={service.id}
                          className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{service.serviceName}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Due: <span className="font-medium text-gray-700">{dueInfo.formattedDue}</span> • Fee: {formatINR(service.serviceAmount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <UrgencyBadge urgency={dueInfo.urgency} customLabel={dueInfo.badgeLabel} />
                            <StatusBadge status={service.followUpStatus} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No active service records.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
