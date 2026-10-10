'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { RotateCw, Building2, Phone, MapPin, Wrench, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const BUSINESS_TYPES = [
  'Air Conditioning Maintenance',
  'RO Water Purifier Service',
  'Appliance Repair & Maintenance',
  'Pest Control Services',
  'Home Cleaning & Deep Wash',
  'Solar Panel Maintenance',
  'General Electrical & Plumbing',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isConfigured, refreshBusinessContext } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Kochi');
  const [timezone] = useState('Asia/Kolkata');
  const [currency] = useState('₹');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = businessName.trim();
    if (!trimmedName) {
      setErrorMsg('Business name is required.');
      return;
    }

    setIsLoading(true);

    try {
      if (isConfigured && user) {
        const supabase = createClient();
        // Invoke atomic onboarding function
        const { data, error } = await supabase.rpc('create_business_and_owner', {
          p_name: trimmedName,
          p_business_type: businessType,
          p_phone: phone.trim(),
          p_city: city.trim(),
          p_timezone: timezone,
          p_currency: currency,
        });

        if (error) {
          throw error;
        }

        if (data && data.id) {
          localStorage.setItem('rd_active_biz_id', data.id);
        }

        await refreshBusinessContext();
      } else {
        // LocalStorage / Demo fallback
        const demoBiz = {
          name: trimmedName,
          business_type: businessType,
          phone: phone.trim() || '+91 98460 11223',
          city: city.trim() || 'Kochi',
          currency,
          timezone,
          defaultIntervalMonths: 6,
        };
        localStorage.setItem('rd_business', JSON.stringify(demoBiz));
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setErrorMsg(err.message || 'Failed to create business account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md">
            <RotateCw className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
            Renewal<span className="text-blue-600">Desk</span>
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Welcome to RenewalDesk!</h2>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Let&apos;s set up your business workspace and automatically initialize your service catalog.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Business Name */}
            <div>
              <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Business / Agency Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kochi Chill AC Care"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-gray-900"
                />
              </div>
            </div>

            {/* Business Type */}
            <div>
              <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Primary Industry / Service Type *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Wrench className="w-4 h-4" />
                </span>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium text-gray-900"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Business Mobile / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98460 11223"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* City / Locality */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Operating City
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Kochi, Kerala"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Automated setup highlights */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 mt-2">
              <span className="font-bold text-blue-950 block text-xs">
                What RenewalDesk will configure for you:
              </span>
              <ul className="text-[11px] text-blue-800 space-y-1 list-disc list-inside">
                <li>Isolated multi-tenant PostgreSQL schema secured by RLS</li>
                <li>Standard service catalog with periodic recurrence intervals</li>
                <li>5 pre-configured WhatsApp follow-up templates ready for outreach</li>
                <li>Live conversion & revenue recovery reporting</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Setting up workspace...</span>
              ) : (
                <>
                  <span>Complete Setup & Launch Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
