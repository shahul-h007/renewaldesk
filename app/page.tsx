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
  Menu,
  X,
  Play,
  Check,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ROI Calculator states
  const [customerCount, setCustomerCount] = useState(1000);
  const [avgTicket, setAvgTicket] = useState(1200);
  const [reachRate, setReachRate] = useState(60); // % reached without tool

  const missedRate = (100 - reachRate) / 100;
  const potentialLostCustomers = Math.round(customerCount * missedRate);
  const recoverableRevenue = potentialLostCustomers * avgTicket;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 text-slate-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              Renewal<span className="text-blue-600">Desk</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <Link href="/demo" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
              <span>Live Demo</span>
            </Link>
            <a href="#roi-calculator" className="hover:text-blue-600 transition-colors">
              ROI Calculator
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-fade-in">
            <div className="space-y-1">
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-600" />
                <span>Explore Live Demo (Sample Data)</span>
              </Link>
              <a
                href="#roi-calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ROI Calculator
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Pricing
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8 bg-radial-gradient overflow-hidden">
        {/* Subtle decorative dot pattern */}
        <div className="absolute inset-0 bg-dot-grid opacity-35 pointer-events-none" />

        <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Built for AC, RO Water Purifier & Appliance Service Businesses</span>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Stop losing customers you <span className="text-blue-600">already earned</span>.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            RenewalDesk automatically spots customers who are due for periodic maintenance, prepares their personalized WhatsApp message, and secures their return booking.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/demo"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-600" />
            <span>Explore Live Demo</span>
          </Link>
          <a
            href="#roi-calculator"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all text-center shadow-2xs"
          >
            Calculate Lost Revenue
          </a>
        </div>

        {/* Live UI Product Mockup Window */}
        <div className="relative z-10 pt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-left ring-1 ring-slate-900/5">
            {/* Mock Browser Header Bar */}
            <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-[11px] font-mono text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  app.renewaldesk.com/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full uppercase">
                  Sample Data Preview
                </span>
              </div>
            </div>

            {/* Mock Dashboard Queue Content */}
            <div className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Today&apos;s Follow-up Queue</h3>
                  <p className="text-xs text-slate-500">18 customers need maintenance attention right now</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold">🔴 7 Overdue</span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">🟠 11 Due This Week</span>
                </div>
              </div>

              {/* Sample Customer Rows */}
              <div className="space-y-2.5">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Mohammed Faisal</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">5 days overdue</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">+91 98471 23456 • Daikin Split AC (1.5T) • Edappally, Kochi</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 mr-2">₹1,200</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Priya Nambiar</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">Due Today</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">+91 98472 34567 • Voltas Window AC (1.0T) • Kakkanad, Kochi</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 mr-2">₹1,200</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] shadow-2xs">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Mockup Footer Callout */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Try the full interactive dashboard with realistic Kochi AC customer data:
                </span>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700"
                >
                  <span>Launch Interactive Live Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 5-Step Continuous Repeat Loop */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              The RenewalDesk Retention Loop
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Transform one-time service transactions into predictable, recurring maintenance bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">1</div>
              <h3 className="font-bold text-sm text-slate-900">Import Customers</h3>
              <p className="text-xs text-slate-500">Upload your customer spreadsheet or add them after a service visit.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">2</div>
              <h3 className="font-bold text-sm text-slate-900">Engine Detects Due</h3>
              <p className="text-xs text-slate-500">Cadence engine flags overdue, due today, and upcoming visits automatically.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mx-auto">3</div>
              <h3 className="font-bold text-sm text-slate-900">1-Click WhatsApp</h3>
              <p className="text-xs text-slate-500">Pre-filled personalized message opens directly in WhatsApp with one click.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto">4</div>
              <h3 className="font-bold text-sm text-slate-900">Service Booked</h3>
              <p className="text-xs text-slate-500">Technician visits the customer, performs service, and collects payment.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mx-auto">5</div>
              <h3 className="font-bold text-sm text-slate-900">Cycle Auto-Resets</h3>
              <p className="text-xs text-slate-500">Due date advances by the service cadence (e.g., 6 months). Never forgotten!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator Section */}
      <section id="roi-calculator" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
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
              Adjust the sliders below based on your active customer base.
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

            {/* Output Card */}
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
                By following up with the <strong className="text-white">{potentialLostCustomers} customers</strong> currently slipping through the cracks without recurring maintenance calls.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-blue-50 shadow-md transition-all mt-2"
              >
                <span>Recover This Revenue with RenewalDesk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              No long-term contracts. Pays for itself with a single recovered service call.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Starter Tier */}
            <div className="p-6 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-base text-slate-900">Starter</h3>
                <div className="text-3xl font-black text-slate-900">₹299 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                <p className="text-xs text-slate-500">Ideal for independent technicians and local repair shops.</p>
                <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">✓ Up to 300 customers</li>
                  <li className="flex items-center gap-2">✓ Automated WhatsApp links</li>
                  <li className="flex items-center gap-2">✓ Excel / CSV customer import</li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="block w-full py-2.5 text-center text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Growth Tier (Highlighted) */}
            <div className="p-6 rounded-2xl border-2 border-blue-600 bg-blue-50/20 space-y-4 relative shadow-md flex flex-col justify-between">
              <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Most Popular
              </span>
              <div className="space-y-4">
                <h3 className="font-bold text-base text-slate-900">Growth</h3>
                <div className="text-3xl font-black text-slate-900">₹599 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                <p className="text-xs text-slate-500">For established service centers and multi-technician teams.</p>
                <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-blue-100">
                  <li className="flex items-center gap-2">✓ Up to 1,000 customers</li>
                  <li className="flex items-center gap-2">✓ Multiple appliances per customer</li>
                  <li className="flex items-center gap-2">✓ Custom message templates</li>
                  <li className="flex items-center gap-2">✓ Recovered revenue reporting</li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="block w-full py-2.5 text-center text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Business Tier */}
            <div className="p-6 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-base text-slate-900">Business</h3>
                <div className="text-3xl font-black text-slate-900">₹999 <span className="text-xs font-normal text-slate-500">/ month</span></div>
                <p className="text-xs text-slate-500">For high-volume operations and AMC contracts.</p>
                <ul className="text-xs space-y-2 text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">✓ Up to 3,000 customers</li>
                  <li className="flex items-center gap-2">✓ Priority phone support</li>
                  <li className="flex items-center gap-2">✓ Unlimited appliances per customer</li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="block w-full py-2.5 text-center text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <RotateCw className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-sm">RenewalDesk</span>
            <span className="text-slate-500 text-[11px]">— Recurring Service Customer Retention</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/demo" className="hover:text-white transition-colors">Live Demo</Link>
            <a href="#roi-calculator" className="hover:text-white transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>

          <p className="text-slate-500 text-[11px]">
            © 2026 RenewalDesk. Built for service centers in Kochi, Kerala & beyond.
          </p>
        </div>
      </footer>
    </div>
  );
}
