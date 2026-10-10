'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { Building2, Save, Check, RotateCcw, ShieldCheck, Cloud, Database, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { business, updateBusiness, resetDemoData, isDatabaseMode } = useRenewalDesk();
  const { user, isConfigured } = useAuth();

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

        {/* Cloud Persistence & Backend Diagnostics */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Backend & Persistence Status
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Runtime configuration and active storage engine for this RenewalDesk workspace.
              </p>
            </div>
            {isDatabaseMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                PostgreSQL Cloud Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Demo Mode (LocalStorage)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">Storage Engine</span>
              <span className="font-semibold text-gray-800">
                {isDatabaseMode ? 'Supabase PostgreSQL (Multi-tenant RLS)' : 'Local Browser Storage (Offline Demo)'}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">Supabase Config</span>
              <span className="font-semibold text-gray-800">
                {isConfigured ? '✓ Configured (.env.local active)' : 'Not Configured (Requires NEXT_PUBLIC_SUPABASE_ANON_KEY)'}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">Active User</span>
              <span className="font-semibold text-gray-800">
                {user ? user.email : 'None (Operating in local demo mode)'}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">Active Business Tenant</span>
              <span className="font-semibold text-gray-800">
                {business.name}
              </span>
            </div>
          </div>

          {!isConfigured && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                Connecting to PostgreSQL Cloud
              </div>
              <p className="text-blue-700 leading-relaxed">
                To connect to your cloud database, set <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code>. Once configured, sign up or log in to launch your isolated cloud tenant.
              </p>
            </div>
          )}
        </div>

        {/* Demo Data Management */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900">Demonstration & Pilot Controls</h3>
          <p className="text-xs text-gray-500">
            {isDatabaseMode
              ? 'Demo controls are disabled while connected to PostgreSQL Cloud. Your cloud customer data is protected.'
              : 'Resetting clears local demo storage and re-populates the real-world Kochi AC service demonstration records (Arun, Faisal, Priya, etc.).'}
          </p>
          <button
            onClick={() => {
              if (isDatabaseMode) {
                alert('Demo dataset reset is disabled in Cloud Mode to protect live database records.');
                return;
              }
              if (confirm('Reset to initial Kochi AC demo dataset?')) {
                resetDemoData();
                alert('Reset complete! Showing fresh demo data.');
              }
            }}
            disabled={isDatabaseMode}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isDatabaseMode
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Sample Dataset
          </button>
        </div>
      </div>
    </AppShell>
  );
}
