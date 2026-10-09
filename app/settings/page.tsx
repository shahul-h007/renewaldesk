'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { Building2, Save, Check, RotateCcw, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { business, updateBusiness, resetDemoData } = useRenewalDesk();

  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [city, setCity] = useState(business.city);
  const [industry, setIndustry] = useState(business.industry);
  const [interval, setInterval] = useState(business.defaultIntervalMonths);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness({
      ...business,
      name,
      phone,
      city,
      industry,
      defaultIntervalMonths: Number(interval),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell
      title="Settings & Business Profile"
      subtitle="Configure your service company details, contact number, and default reminder settings."
    >
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-gray-900">Business Profile</h2>
            <p className="text-xs text-gray-500">
              These details are automatically populated in your outgoing WhatsApp templates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                City / Locality
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Industry Vertical
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Air Conditioning Maintenance">Air Conditioning Maintenance</option>
                <option value="RO Water Purifier Service">RO Water Purifier Service</option>
                <option value="Pest Control Services">Pest Control Services</option>
                <option value="Home Appliance Repair">Home Appliance Repair</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-semibold">
              {saved && '✓ Business settings saved!'}
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>

        {/* Demo Data Management */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900">Demonstration & Pilot Controls</h3>
          <p className="text-xs text-gray-500">
            Resetting clears local storage and re-populates the real-world Kochi AC service demonstration records (Arun, Faisal, Priya, etc.).
          </p>
          <button
            onClick={() => {
              if (confirm('Reset to initial Kochi AC demo dataset?')) {
                resetDemoData();
                alert('Reset complete! Showing fresh demo data.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Sample Dataset
          </button>
        </div>
      </div>
    </AppShell>
  );
}
