'use client';

import React, { useState, useEffect } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { ServiceCatalogItem, IntervalUnit } from '@/lib/types';
import { formatIntervalDisplay } from '@/lib/due-date-engine';
import { X, Wrench, AlertCircle, CheckCircle2, Trash2, Power, Clock, Info } from 'lucide-react';

interface ServiceTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: ServiceCatalogItem | null;
}

export function ServiceTypeModal({ isOpen, onClose, itemToEdit }: ServiceTypeModalProps) {
  const { addServiceType, updateServiceType, deleteServiceType, business, services } = useRenewalDesk();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intervalValue, setIntervalValue] = useState(6);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('MONTHS');
  const [typicalPrice, setTypicalPrice] = useState(1200);
  const [isActive, setIsActive] = useState(true);
  const [updateExistingCustomers, setUpdateExistingCustomers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const isEditing = Boolean(itemToEdit);
  const referencedCount = itemToEdit
    ? services.filter(s => s.serviceName.toLowerCase() === itemToEdit.name.toLowerCase()).length
    : 0;

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description || '');
      setIntervalValue(itemToEdit.intervalValue ?? itemToEdit.defaultIntervalMonths ?? 6);
      setIntervalUnit(itemToEdit.intervalUnit ?? 'MONTHS');
      setTypicalPrice(itemToEdit.typicalPrice);
      setIsActive(itemToEdit.isActive !== false);
      setUpdateExistingCustomers(false);
      setErrorMsg(null);
      setDeleteWarning(null);
    } else {
      setName('');
      setDescription('');
      setIntervalValue(6);
      setIntervalUnit('MONTHS');
      setTypicalPrice(1200);
      setIsActive(true);
      setUpdateExistingCustomers(false);
      setErrorMsg(null);
      setDeleteWarning(null);
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Service name is required.');
      return;
    }

    if (intervalValue < 1) {
      setErrorMsg('Repeat interval must be at least 1.');
      return;
    }

    if (typicalPrice < 0 || isNaN(typicalPrice)) {
      setErrorMsg('Typical fee must be a non-negative number.');
      return;
    }

    const defaultIntervalMonths =
      intervalUnit === 'YEARS'
        ? intervalValue * 12
        : intervalUnit === 'DAYS'
        ? Math.max(1, Math.round(intervalValue / 30))
        : intervalValue;

    try {
      if (isEditing && itemToEdit) {
        updateServiceType(
          {
            id: itemToEdit.id,
            name: trimmedName,
            description: description.trim(),
            intervalValue,
            intervalUnit,
            defaultIntervalMonths,
            typicalPrice: Number(typicalPrice),
            isActive,
          },
          updateExistingCustomers
        );
      } else {
        addServiceType({
          name: trimmedName,
          description: description.trim(),
          intervalValue,
          intervalUnit,
          defaultIntervalMonths,
          typicalPrice: Number(typicalPrice),
          isActive,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the service type.');
    }
  };

  const handleDeleteOrDeactivate = () => {
    if (!itemToEdit) return;

    if (referencedCount > 0) {
      // Deactivate instead of deleting
      const res = deleteServiceType(itemToEdit.id);
      setDeleteWarning(res.reason || `This service type has ${referencedCount} customer records. It has been deactivated.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      if (confirm(`Are you sure you want to delete "${itemToEdit.name}"?`)) {
        deleteServiceType(itemToEdit.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? 'Edit Service Type' : 'Add New Service Type'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing
                  ? 'Update cadence, typical pricing, or status'
                  : 'Define a new recurring service cycle for your catalog'}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {deleteWarning && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{deleteWarning}</span>
            </div>
          )}

          {/* Service Name */}
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Service Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AC Filter Cleaning & Drainage Flush"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what this service covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed resize-none"
            />
          </div>

          {/* Repeat Interval & Unit */}
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Repeat Interval Cadence *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min={1}
                  required
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-gray-900"
                />
              </div>
              <div>
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium text-gray-800"
                >
                  <option value="DAYS">Days</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Customer due dates will recur every{' '}
              <strong className="text-blue-700">
                {formatIntervalDisplay(intervalValue, intervalUnit)}
              </strong>
            </p>
          </div>

          {/* Typical Fee (₹) */}
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Typical Fee ({business.currency}) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">
                {business.currency}
              </span>
              <input
                type="number"
                min={0}
                required
                value={typicalPrice}
                onChange={(e) => setTypicalPrice(Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-gray-900"
              />
            </div>
          </div>

          {/* Active / Inactive Status */}
          <div>
            <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Service Status
            </label>
            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                <input
                  type="radio"
                  name="service_status"
                  checked={isActive}
                  onChange={() => setIsActive(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                <input
                  type="radio"
                  name="service_status"
                  checked={!isActive}
                  onChange={() => setIsActive(false)}
                  className="w-4 h-4 text-gray-600 focus:ring-gray-500"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Inactive
                </span>
              </label>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {isActive
                ? 'Available in Add Customer dropdown and used for active service scheduling.'
                : 'Hidden from new customer forms; existing history remains intact.'}
            </p>
          </div>

          {/* Editing Caveat & Future Cycles Checkbox */}
          {isEditing && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-900 block">Interval Application Policy</span>
                  <p className="text-[11px] text-blue-800 leading-normal">
                    By default, new intervals apply to future service completions without altering existing scheduled customer due dates.
                  </p>
                </div>
              </div>

              {referencedCount > 0 && (
                <label className="flex items-start gap-2 pt-1 border-t border-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExistingCustomers}
                    onChange={(e) => setUpdateExistingCustomers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 mt-0.5"
                  />
                  <span className="text-[11px] text-blue-950 font-medium">
                    Also recalculate upcoming due dates for the {referencedCount} active customer(s) using this service
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Referenced status notice */}
          {isEditing && referencedCount > 0 && (
            <div className="text-[11px] text-gray-500">
              Referenced by <strong className="text-gray-800">{referencedCount}</strong> customer records.
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDeleteOrDeactivate}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title={referencedCount > 0 ? 'Deactivate service type' : 'Delete service type'}
              >
                {referencedCount > 0 ? <Power className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{referencedCount > 0 ? 'Deactivate' : 'Delete'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save Changes' : 'Create Service Type'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
