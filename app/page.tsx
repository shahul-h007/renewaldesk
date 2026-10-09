'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RotateCw,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Phone,
} from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function LandingPage() {
  // ROI Calculator states
  const [customerCount, setCustomerCount] = useState(1000);
  const [avgTicket, setAvgTicket] = useState(1200);
  const [reachRate, setReachRate] = useState(60); // % reached without tool

  const missedRate = (100 - reachRate) / 100;
  const potentialLostCustomers = Math.round(customerCount * missedRate);
  const recoverableRevenue = potentialLostCustomers * avgTicket;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">
              Renewal<span className="text-blue-600">Desk</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 hidden sm:inline"
            >
              Live Demo
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <span>Open Follow-up App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Built for AC, RO, and Appliance Service Businesses</span>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
            Stop losing customers you <span className="text-blue-600">already earned</span>.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            RenewalDesk automatically spots customers who are due for recurring maintenance, prepares their WhatsApp follow-up, and schedules their next return visit.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>Start Free Trial (14 Days)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#roi-calculator"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-all text-center"
          >
            Calculate Lost Revenue
          </a>
        </div>

        {/* Live UI Product Mockup */}
        <div className="pt-10 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden text-left">
            {/* Mock Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs font-mono text-gray-400">renewaldesk.app/dashboard</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Active Queue
              </span>
            </div>

            {/* Mock Content */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Today&apos;s Follow-up Queue</h3>
                  <p className="text-xs text-gray-500">18 customers need attention right now</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">🔴 7 Overdue</span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">🟠 11 Due This Week</span>
                </div>
              </div>

              {/* Sample Customer Row in Mockup */}
              <div className="p-4 rounded-xl border border-gray-200 bg-blue-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">Arun Kumar</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">5 days overdue</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">+91 98460 12345 • Samsung Split AC (1.5T) • Edappally, Kochi</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </Link>
                  <span className="text-xs font-bold text-gray-900 ml-2">₹1,200</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 5-Step Continuous Repeat Loop */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              The RenewalDesk Repeat Loop
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Transform one-time service calls into reliable, predictable recurring customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">1</div>
              <h3 className="font-bold text-sm text-gray-900">Import Customer</h3>
              <p className="text-xs text-gray-500">Upload your phone contacts or Excel service list.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">2</div>
              <h3 className="font-bold text-sm text-gray-900">Engine Detects Due</h3>
              <p className="text-xs text-gray-500">Overdue and upcoming jobs automatically flagged.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mx-auto">3</div>
              <h3 className="font-bold text-sm text-gray-900">1-Click WhatsApp</h3>
              <p className="text-xs text-gray-500">Pre-filled personalized message sent via wa.me link.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">4</div>
              <h3 className="font-bold text-sm text-gray-900">Service Booked</h3>
              <p className="text-xs text-gray-500">Technician visits and completes maintenance.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center mx-auto">5</div>
              <h3 className="font-bold text-sm text-gray-900">Auto Rescheduled</h3>
              <p className="text-xs text-gray-500">Pushed 6 months ahead automatically. Never lost!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator Section */}
      <section id="roi-calculator" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-12 text-white shadow-xl space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Interactive ROI Calculator
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              How much revenue is sitting in your customer list?
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              Adjust the sliders below based on your service business numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
            {/* Sliders */}
            <div className="space-y-6 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span>Total Past Customers</span>
                  <span className="text-blue-300 font-mono text-sm">{customerCount} customers</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={customerCount}
                  onChange={(e) => setCustomerCount(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span>Average Service Bill (₹)</span>
                  <span className="text-blue-300 font-mono text-sm">₹{avgTicket}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="100"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span>Customers you currently remember to reach</span>
                  <span className="text-blue-300 font-mono text-sm">{reachRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={reachRate}
                  onChange={(e) => setReachRate(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Big Output Card */}
            <div className="text-center p-8 bg-white/10 rounded-2xl border border-white/10 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Potential Recoverable Revenue
              </span>
              <div
                suppressHydrationWarning
                className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono"
              >
                ₹{formatINR(recoverableRevenue)}
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                By following up with the <strong className="text-white">{potentialLostCustomers} customers</strong> currently slipping through the cracks without regular maintenance calls.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 rounded-xl text-xs font-bold text-gray-900 bg-white hover:bg-blue-50 shadow-md transition-all mt-2"
              >
                Recover This Revenue with RenewalDesk
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Transparent Pricing */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Simple, Honest Pricing
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              No long-term commitments. Pays for itself with a single recovered service call.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Tier 1 */}
            <div className="p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="font-bold text-base text-gray-900">Starter</h3>
              <div className="text-2xl font-black text-gray-900">₹299 <span className="text-xs font-normal text-gray-500">/ month</span></div>
              <p className="text-xs text-gray-500">Ideal for single technicians or new shops.</p>
              <ul className="text-xs space-y-2 text-gray-600 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2">✓ Up to 300 customers</li>
                <li className="flex items-center gap-2">✓ Automated WhatsApp links</li>
                <li className="flex items-center gap-2">✓ Excel / CSV import</li>
              </ul>
              <Link href="/dashboard" className="block w-full py-2.5 text-center text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Tier 2 (Highlighted) */}
            <div className="p-6 rounded-2xl border-2 border-blue-600 bg-blue-50/20 space-y-4 relative shadow-md">
              <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Most Popular
              </span>
              <h3 className="font-bold text-base text-gray-900">Growth</h3>
              <div className="text-2xl font-black text-gray-900">₹599 <span className="text-xs font-normal text-gray-500">/ month</span></div>
              <p className="text-xs text-gray-500">For established service centers & teams.</p>
              <ul className="text-xs space-y-2 text-gray-600 pt-2 border-t border-blue-100">
                <li className="flex items-center gap-2">✓ Up to 1,000 customers</li>
                <li className="flex items-center gap-2">✓ Multiple appliance tracking</li>
                <li className="flex items-center gap-2">✓ Custom message templates</li>
                <li className="flex items-center gap-2">✓ Recovered revenue reporting</li>
              </ul>
              <Link href="/dashboard" className="block w-full py-2.5 text-center text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Tier 3 */}
            <div className="p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="font-bold text-base text-gray-900">Business</h3>
              <div className="text-2xl font-black text-gray-900">₹999 <span className="text-xs font-normal text-gray-500">/ month</span></div>
              <p className="text-xs text-gray-500">For multi-technician operations & AMC contracts.</p>
              <ul className="text-xs space-y-2 text-gray-600 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2">✓ Up to 3,000 customers</li>
                <li className="flex items-center gap-2">✓ Priority phone support</li>
                <li className="flex items-center gap-2">✓ Unlimited appliances per customer</li>
              </ul>
              <Link href="/dashboard" className="block w-full py-2.5 text-center text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800">
                Start 14-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>© 2026 RenewalDesk. Built for service businesses in Kochi, Kerala & beyond.</p>
        <p className="mt-1">Remember → Remind → Book → Repeat.</p>
      </footer>
    </div>
  );
}
