'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RotateCw,
  Sparkles,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  DollarSign,
  Search,
  RotateCcw,
  LogIn,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  Home,
} from 'lucide-react';
import { FollowUpRow } from '@/components/FollowUpRow';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { CompleteServiceModal } from '@/components/CompleteServiceModal';
import { formatINR } from '@/lib/format';
import { calculateDueStatus, calculateNextDueDate } from '@/lib/due-date-engine';
import { Customer, Asset, ServiceRecord, FollowUpStatus, IntervalUnit, WhatsAppTemplate } from '@/lib/types';
import { DEFAULT_TEMPLATES } from '@/lib/whatsapp';

// Isolated sample dataset for public exploration
const DEMO_BUSINESS = {
  name: 'Kochi Chill AC Care',
  phone: '+91 98460 11223',
  industry: 'Air Conditioning Maintenance',
  city: 'Kochi',
  currency: '₹',
  defaultIntervalMonths: 6,
};

const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Mohammed Faisal', phone: '+91 98471 23456', address: 'Edappally, Kochi', locality: 'Edappally', createdAt: '2026-01-10' },
  { id: 'c-2', name: 'Priya Nambiar', phone: '+91 98472 34567', address: 'Kakkanad, Kochi', locality: 'Kakkanad', createdAt: '2026-01-15' },
  { id: 'c-3', name: 'Dr. Thomas Mathew', phone: '+91 98473 45678', address: 'Palarivattom, Kochi', locality: 'Palarivattom', createdAt: '2026-01-20' },
  { id: 'c-4', name: 'Fathima Beevi', phone: '+91 98474 56789', address: 'Panampilly Nagar, Kochi', locality: 'Panampilly Nagar', createdAt: '2026-02-01' },
  { id: 'c-5', name: 'Rajesh Nair', phone: '+91 98475 67890', address: 'Aluva, Kochi', locality: 'Aluva', createdAt: '2026-02-10' },
  { id: 'c-6', name: 'Anjali Menon', phone: '+91 98476 78901', address: 'Vyttila, Kochi', locality: 'Vyttila', createdAt: '2026-02-15' },
  { id: 'c-7', name: 'George Varghese', phone: '+91 98477 89012', address: 'Ravipuram, Kochi', locality: 'Ravipuram', createdAt: '2026-02-20' },
  { id: 'c-8', name: 'Deepa Suresh', phone: '+91 98478 90123', address: 'Thripunithura, Kochi', locality: 'Thripunithura', createdAt: '2026-03-01' },
];

const INITIAL_DEMO_ASSETS: Asset[] = [
  { id: 'a-1', customerId: 'c-1', name: 'Daikin Inverter Split AC', capacity: '1.5 Ton', location: 'Living Room', model: 'FTKF50TV16U' },
  { id: 'a-2', customerId: 'c-2', name: 'Voltas Window AC', capacity: '1.0 Ton', location: 'Bedroom 1', model: '122 LZD' },
  { id: 'a-3', customerId: 'c-3', name: 'Mitsubishi Heavy Industries 5-Star Split AC', capacity: '2.0 Ton', location: 'Consultation Room', model: 'SRK20CRS-S6' },
  { id: 'a-4', customerId: 'c-4', name: 'Panasonic Twin Cool Split AC', capacity: '1.5 Ton', location: 'Master Bedroom', model: 'CS-KU18WKYXF' },
  { id: 'a-5', customerId: 'c-5', name: 'LG Dual Inverter Split AC', capacity: '1.5 Ton', location: 'Dining Area', model: 'RS-Q19ENZE' },
  { id: 'a-6', customerId: 'c-6', name: 'Carrier Em陞鈴ia Split AC', capacity: '1.5 Ton', location: 'Home Office', model: 'CAI18ER3R30F0' },
  { id: 'a-7', customerId: 'c-7', name: 'Blue Star Inverter Split AC', capacity: '2.0 Ton', location: 'Conference Room', model: 'IC524DATU' },
  { id: 'a-8', customerId: 'c-8', name: 'Hitachi Shizen Split AC', capacity: '1.5 Ton', location: 'Drawing Room', model: 'RAU518HTE' },
];

function generateDemoServices(): ServiceRecord[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() - n);
    return formatYMD(d);
  };
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() + n);
    return formatYMD(d);
  };
  const monthsAgo = (m: number) => {
    const d = new Date();
    d.setMonth(today.getMonth() - m);
    return formatYMD(d);
  };

  const raw = [
    { id: 's-1', customerId: 'c-1', assetId: 'a-1', serviceName: 'AC Periodic General Service', lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(5), intervalMonths: 6, serviceAmount: 1200, followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Filter cleaning + drainage flush' },
    { id: 's-2', customerId: 'c-2', assetId: 'a-2', serviceName: 'AC Periodic General Service', lastServiceDate: monthsAgo(6), nextDueDate: formatYMD(today), intervalMonths: 6, serviceAmount: 1200, followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Condenser coil inspection' },
    { id: 's-3', customerId: 'c-3', assetId: 'a-3', serviceName: 'Deep Jet Chemical Foam Wash', lastServiceDate: monthsAgo(12), nextDueDate: daysFromNow(3), intervalMonths: 12, serviceAmount: 1800, followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'High cooling load room' },
    { id: 's-4', customerId: 'c-4', assetId: 'a-4', serviceName: 'AC Periodic General Service', lastServiceDate: monthsAgo(6), nextDueDate: daysFromNow(5), intervalMonths: 6, serviceAmount: 1200, followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Window unit bracket check' },
    { id: 's-5', customerId: 'c-5', assetId: 'a-5', serviceName: 'AC Periodic General Service', lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(12), intervalMonths: 6, serviceAmount: 1400, followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Cooling slightly reduced' },
    { id: 's-6', customerId: 'c-6', assetId: 'a-6', serviceName: 'Deep Jet Chemical Foam Wash', lastServiceDate: monthsAgo(12), nextDueDate: daysAgo(2), intervalMonths: 12, serviceAmount: 1800, followUpStatus: 'CONTACTED' as FollowUpStatus, lastContactedAt: daysAgo(1), notes: 'WhatsApp sent yesterday, waiting for reply' },
    { id: 's-7', customerId: 'c-7', assetId: 'a-7', serviceName: 'AC Periodic General Service', lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(1), intervalMonths: 6, serviceAmount: 2000, followUpStatus: 'BOOKED' as FollowUpStatus, bookingDate: daysFromNow(1), notes: 'Customer booked for tomorrow 11 AM' },
    { id: 's-8', customerId: 'c-8', assetId: 'a-8', serviceName: 'AC Periodic General Service', lastServiceDate: daysAgo(7), nextDueDate: daysFromNow(173), intervalMonths: 6, serviceAmount: 1200, followUpStatus: 'COMPLETED' as FollowUpStatus, completedDate: daysAgo(7), notes: 'Payment ₹1,200 collected via UPI' },
  ];

  return raw.map(s => ({
    ...s,
    urgency: calculateDueStatus(s.nextDueDate).urgency,
  }));
}

export default function DemoPage() {
  const [customers] = useState<Customer[]>(INITIAL_DEMO_CUSTOMERS);
  const [assets] = useState<Asset[]>(INITIAL_DEMO_ASSETS);
  const [services, setServices] = useState<ServiceRecord[]>(generateDemoServices);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'WEEK' | 'COMPLETED'>('OVERDUE');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [whatsappModalState, setWhatsappModalState] = useState<{
    isOpen: boolean;
    customer?: Customer;
    asset?: Asset;
    service?: ServiceRecord;
  }>({ isOpen: false });

  const [completeModalState, setCompleteModalState] = useState<{
    isOpen: boolean;
    service?: ServiceRecord;
    customer?: Customer;
  }>({ isOpen: false });

  const resetDemoState = () => {
    setServices(generateDemoServices());
    setSearchQuery('');
    setActiveTab('OVERDUE');
  };

  const handleUpdateStatus = (serviceId: string, status: FollowUpStatus) => {
    setServices(prev =>
      prev.map(s => (s.id === serviceId ? { ...s, followUpStatus: status, lastContactedAt: new Date().toISOString() } : s))
    );
  };

  const handleCompleteService = (
    serviceId: string,
    completedDate: string,
    amount: number,
    intervalValue: number,
    intervalUnit: IntervalUnit
  ) => {
    const todayStr = completedDate || new Date().toISOString().split('T')[0];
    const s = services.find(item => item.id === serviceId);
    if (!s) return;

    const nextDue = calculateNextDueDate(todayStr, intervalValue || s.intervalMonths || 6, intervalUnit || 'MONTHS');

    setServices(prev =>
      prev.map(item =>
        item.id === serviceId
          ? {
              ...item,
              followUpStatus: 'COMPLETED' as FollowUpStatus,
              completedDate: todayStr,
              lastServiceDate: todayStr,
              nextDueDate: nextDue,
              urgency: calculateDueStatus(nextDue).urgency,
              serviceAmount: amount !== undefined ? amount : item.serviceAmount,
            }
          : item
      )
    );
  };

  // Metrics
  const overdueServices = services.filter(s => s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED');
  const todayServices = services.filter(s => s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED');
  const weekServices = services.filter(s => s.urgency === 'DUE_THIS_WEEK' && s.followUpStatus !== 'COMPLETED');
  const completedServices = services.filter(s => s.followUpStatus === 'COMPLETED');

  const recoveredRevenue = completedServices.reduce((sum, s) => sum + (s.serviceAmount || 0), 0);
  const potentialRevenue = [...overdueServices, ...todayServices, ...weekServices].reduce(
    (sum, s) => sum + (s.serviceAmount || 0),
    0
  );

  // Filter queue
  let filtered = services.filter(s => {
    if (activeTab === 'OVERDUE') return s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'TODAY') return s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'WEEK') return s.urgency === 'DUE_THIS_WEEK' && s.followUpStatus !== 'COMPLETED';
    if (activeTab === 'COMPLETED') return s.followUpStatus === 'COMPLETED';
    return s.followUpStatus !== 'COMPLETED';
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => {
      const c = customers.find(cust => cust.id === s.customerId);
      const a = assets.find(ast => ast.id === s.assetId);
      return (
        c?.name.toLowerCase().includes(q) ||
        c?.phone.includes(q) ||
        c?.locality?.toLowerCase().includes(q) ||
        a?.name.toLowerCase().includes(q)
      );
    });
  }

  filtered.sort((a, b) => {
    if (a.urgency === 'OVERDUE' && b.urgency !== 'OVERDUE') return -1;
    if (b.urgency === 'OVERDUE' && a.urgency !== 'OVERDUE') return 1;
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Demo Isolation Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 shadow-sm border-b border-amber-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0">
              Live Demo Mode
            </span>
            <span>
              Exploring sample workspace for <strong>Kochi Chill AC Care</strong>. Changes are local and do not modify any live database.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={resetDemoState}
              title="Reset sample data"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600/30 hover:bg-amber-600/50 text-slate-950 font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-950 hover:bg-slate-900 text-white font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Start Free Trial</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-900 font-semibold border border-amber-600/40 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Link>
            <Link
              href="/"
              title="Return to homepage"
              className="p-1 rounded-md text-slate-900 hover:bg-amber-400/40 transition-colors"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Demo Workspace Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <RotateCw className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">RenewalDesk — Follow-up Queue</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Interactive Preview
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Test how RenewalDesk surfaces due maintenance dates, generates 1-click WhatsApp messages, and recovers repeat revenue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Ready to manage your real business?</span>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Overdue */}
          <div
            onClick={() => setActiveTab('OVERDUE')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'OVERDUE' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{overdueServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Action Required</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Passed recommended maintenance window</p>
          </div>

          {/* Due Today */}
          <div
            onClick={() => setActiveTab('TODAY')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'TODAY' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Today</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{todayServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Contact Today</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Scheduled for periodic service today</p>
          </div>

          {/* Due This Week */}
          <div
            onClick={() => setActiveTab('WEEK')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'WEEK' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due This Week</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{weekServices.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Upcoming</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Due in the next 7 days</p>
          </div>

          {/* Recovered Revenue */}
          <div
            onClick={() => setActiveTab('COMPLETED')}
            className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all shadow-xs ${
              activeTab === 'COMPLETED' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovered Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">₹{formatINR(recoveredRevenue)}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {completedServices.length} Done
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Potential pending: ₹{formatINR(potentialRevenue)}</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'OVERDUE', label: 'Overdue', count: overdueServices.length, badge: 'bg-red-500' },
              { id: 'TODAY', label: 'Due Today', count: todayServices.length, badge: 'bg-orange-500' },
              { id: 'WEEK', label: 'Due This Week', count: weekServices.length, badge: 'bg-amber-500' },
              { id: 'ALL', label: 'All Pending', count: overdueServices.length + todayServices.length + weekServices.length },
              { id: 'COMPLETED', label: 'Completed', count: completedServices.length, badge: 'bg-emerald-600' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sample customer, area, AC..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Follow-up Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {activeTab} Queue ({filtered.length} customers)
            </h2>
            <span className="text-[11px] text-slate-400">
              Interactive preview • Click WhatsApp to test 1-click links
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No customers in this queue</p>
              <p className="text-xs">Great job! All customer reminders for this filter have been handled.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(service => {
                const customer = customers.find(c => c.id === service.customerId);
                const asset = assets.find(a => a.id === service.assetId);
                if (!customer) return null;

                return (
                  <div key={service.id} className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors">
                    <FollowUpRow
                      service={service}
                      customer={customer}
                      asset={asset}
                      onUpdateStatus={status => handleUpdateStatus(service.id, status)}
                      onOpenWhatsApp={() =>
                        setWhatsappModalState({
                          isOpen: true,
                          customer,
                          asset,
                          service,
                        })
                      }
                      onOpenComplete={() =>
                        setCompleteModalState({
                          isOpen: true,
                          service,
                          customer,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Interactive WhatsApp Modal in Demo */}
      <WhatsAppModal
        isOpen={whatsappModalState.isOpen}
        onClose={() => setWhatsappModalState({ isOpen: false })}
        customer={whatsappModalState.customer}
        asset={whatsappModalState.asset}
        service={whatsappModalState.service}
      />

      {/* Interactive Complete Service Modal in Demo */}
      {completeModalState.isOpen && completeModalState.service && (
        <CompleteServiceModal
          isOpen={completeModalState.isOpen}
          onClose={() => setCompleteModalState({ isOpen: false })}
          service={completeModalState.service}
          customer={completeModalState.customer}
          onComplete={handleCompleteService}
        />
      )}
    </div>
  );
}
