'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Modal } from '@/components/ui/Modal';
import { useTutorial } from '@/components/TutorialContext';
import { TUTORIAL_LESSONS } from '@/lib/tutorial-content';
import { AppShell } from '@/components/AppShell';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  Building2,
  Save,
  Check,
  RotateCcw,
  ShieldCheck,
  Cloud,
  Database,
  AlertCircle,
  Wrench,
  MessageSquare,
  CreditCard,
  HelpCircle,
  Upload,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { BUSINESS_TYPE_OPTIONS, getCanonicalCategoryLabel } from '@/lib/catalog-presets';

type SettingsTab = 'PROFILE' | 'SERVICES' | 'TEMPLATES' | 'BILLING' | 'HELP';

export default function SettingsPage() {
  const {
    business,
    updateBusiness,
    resetDemoData,
    isDatabaseMode,
    isLoadingDb,
    isLoaded,
    catalog,
    customers,
  } = useRenewalDesk();
  const { user, isConfigured, isLoading: isAuthLoading, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SettingsTab>('PROFILE');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const toast = useToast();
  const { state: tutorialState, resume: resumeTutorial, redo: redoTutorial } = useTutorial();
  const [isRedoModalOpen, setIsRedoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [city, setCity] = useState(business.city);
  const [industry, setIndustry] = useState(() => getCanonicalCategoryLabel(business.industry));
  const [interval, setInterval] = useState(business.defaultIntervalMonths);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (business.name) {
      setName(business.name);
      setPhone(business.phone);
      setCity(business.city);
      setIndustry(getCanonicalCategoryLabel(business.industry));
      setInterval(business.defaultIntervalMonths);
    }
  }, [business]);

  const isDev = process.env.NODE_ENV === 'development';
  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  if (isCloudLoading) {
    return (
      <AppShell
        title="Settings & Workspace Hub"
        subtitle="Manage shop profile, service catalog, templates, and subscription."
      >
        <div className="max-w-4xl space-y-6 animate-pulse">
          <div className="h-12 w-full max-w-sm bg-gray-200 rounded-xl" />
          <div className="h-96 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4" />
        </div>
      </AppShell>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const canonicalIndustry = getCanonicalCategoryLabel(industry);
      await updateBusiness({
        ...business,
        name,
        phone,
        city,
        industry: canonicalIndustry,
        defaultIntervalMonths: Number(interval),
      });
      setIndustry(canonicalIndustry);
      setSaved(true);
      toast.success('Shop profile saved successfully!');
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error('Failed to update business settings:', err);
      setSaveError(err?.message || 'Failed to save settings. Please try again.');
      toast.error(err?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!business.name || deleteConfirmText.trim().toLowerCase() !== business.name.trim().toLowerCase()) {
      setDeleteError(`Please type "${business.name}" exactly to confirm.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (isDatabaseMode && business.id) {
        const res = await fetch('/api/business/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            businessNameConfirmation: deleteConfirmText.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete workspace.');
        }
      }

      toast.success('Workspace and all data permanently erased.');
      setIsDeleteModalOpen(false);
      resetDemoData();
      if (signOut) {
        await signOut();
      }
      router.push('/login?message=workspace_deleted');
    } catch (err: any) {
      console.error('Workspace deletion error:', err);
      setDeleteError(err.message || 'An unexpected error occurred while deleting.');
      toast.error(err.message || 'Failed to delete workspace.');
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs: TabItem[] = [
    { id: 'PROFILE', label: 'Shop Profile', icon: Building2 },
    { id: 'SERVICES', label: 'Services', count: catalog.length, icon: Wrench },
    { id: 'TEMPLATES', label: 'Templates', icon: MessageSquare },
    { id: 'BILLING', label: 'Billing', icon: CreditCard },
    { id: 'HELP', label: 'Help & Tutorial', icon: HelpCircle },
  ];

  return (
    <AppShell
      title="Settings & Workspace Hub"
      subtitle="Manage your shop profile, service catalog, WhatsApp templates, and billing."
    >
      <div className="max-w-4xl space-y-6">
        {/* Settings Navigation Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as SettingsTab)}
            variant="pill"
          />
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SHOP PROFILE */}
        {/* ============================================================== */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-6">
            <form data-tutorial="settings-profile-tab" onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-8 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-gray-900">Business Profile</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These business details are automatically included in outgoing WhatsApp renewal messages and client invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <Input
                label="Business Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Enfield Service Hub"
              />

              <Input
                label="WhatsApp Phone Number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9846011222"
                helperText="Indian 10-digit number for customer replies."
              />

              <Input
                label="City / Locality"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kochi, Ernakulam"
              />

              <div>
                <Select
                  label="Industry Vertical"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={isSaving}
                  helperText="Defines your default service catalog presets and WhatsApp message tones."
                >
                  {BUSINESS_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Input
                  label="Default Interval (Months)"
                  type="number"
                  min="1"
                  max="36"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  helperText="Standard recurring follow-up cycle for new appliances."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {saved && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Business profile updated successfully!
                  </span>
                )}
                {saveError && (
                  <span className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {saveError}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={Save}
                className="w-full sm:w-auto"
              >
                {saved ? 'Saved' : 'Save Changes'}
              </Button>
            </div>
          </form>

          {/* Danger Zone: Workspace Deletion & DPDP Act Data Erasure */}
          <div className="pt-6 border-t border-red-100">
            <Card className="border-red-200 bg-red-50/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <CardTitle className="text-red-950 text-base">Danger Zone: Workspace Deletion &amp; Data Erasure</CardTitle>
                </div>
                <CardDescription className="text-red-800/80">
                  Permanently delete this workspace and all associated customer, equipment, service, reminder, and billing records in compliance with India&apos;s Digital Personal Data Protection (DPDP) Act, 2023. This action is irreversible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-gray-600">
                <p>
                  Deleting your workspace will immediately cascade and permanently erase all registered customers, assets, past service histories, custom WhatsApp templates, and billing transactions.
                </p>
              </CardContent>
              <CardFooter className="bg-red-50/60 border-t border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs text-red-800 font-medium">
                  Workspace owner action. Requires exact shop name confirmation.
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setDeleteError(null);
                    setIsDeleteModalOpen(true);
                  }}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Workspace &amp; All Data
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SERVICES & CATALOG */}
        {/* ============================================================== */}
        {activeTab === 'SERVICES' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Service Catalog & Pricing</CardTitle>
                    <CardDescription>
                      Configure recurrence schedules, intervals, and typical service charges for your industry.
                    </CardDescription>
                  </div>
                  <Badge variant="primary">{catalog.length} Services</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {catalog.slice(0, 4).map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-gray-500">Every {item.intervalValue} {item.intervalUnit.toLowerCase()}</p>
                      </div>
                      <span className="font-extrabold text-gray-800">
                        {business.currency}{item.typicalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Add custom services, edit prices, or adjust reminder intervals.
                </p>
                <Link href="/services" className="w-full sm:w-auto">
                  <Button variant="primary" size="md" rightIcon={ArrowRight} className="w-full sm:w-auto">
                    Manage Full Service Catalog
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TEMPLATES */}
        {/* ============================================================== */}
        {activeTab === 'TEMPLATES' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>WhatsApp Message Templates</CardTitle>
                    <CardDescription>
                      Customize the 5 customer lifecycle messages and generate tailored templates with AI.
                    </CardDescription>
                  </div>
                  <Badge variant="whatsapp">wa.me Ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-gray-600">
                <p>
                  RenewalDesk includes 5 ready-to-use message triggers:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">1. Due Today Reminder</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Polite reminder for scheduled service renewal.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">2. 7-Day Overdue</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Gentle nudge to prevent appliance breakdown.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">3. 30-Day Critical Overdue</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Urgent recall highlighting safety and efficiency.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">4. Booking Confirmed</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Confirmation text with scheduled visit time.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Supports Malayalam, English, and client placeholders like {'{customer_name}'}.
                </p>
                <Link href="/templates" className="w-full sm:w-auto">
                  <Button variant="primary" size="md" rightIcon={ArrowRight} className="w-full sm:w-auto">
                    Open Template Editor & AI Prompts
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: BILLING & PLANS */}
        {/* ============================================================== */}
        {activeTab === 'BILLING' && (
          <div className="space-y-4">
            <Card data-tutorial="settings-billing-tab">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle>Subscription & Workspace Capacity</CardTitle>
                    <CardDescription>
                      Manage your plan, check active customer limits, or activate founding lifetime access.
                    </CardDescription>
                  </div>
                  <Badge variant="purple" className="shrink-0">Razorpay Secure</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium block mb-1">Active Customers</span>
                    <span className="text-lg font-bold text-gray-900">{customers.length}</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium block mb-1">Free Trial</span>
                    <span className="text-lg font-bold text-emerald-700">14 Days Free</span>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium block mb-1">Payments Engine</span>
                    <span className="text-lg font-bold text-gray-900">UPI / Cards / Netbanking</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Upgrade anytime or review past billing receipts.
                </p>
                <Link href="/billing" className="w-full sm:w-auto">
                  <Button variant="primary" size="md" rightIcon={ArrowRight} className="w-full sm:w-auto">
                    View Plans & Upgrade
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: HELP & TOUR */}
        {/* ============================================================== */}
        {activeTab === 'HELP' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>How RenewalDesk Works</CardTitle>
                <CardDescription>
                  The continuous 4-step loop designed for Indian recurring service providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="font-bold text-blue-900 block mb-1">1. Remember</span>
                    <p className="text-blue-700">Calculates next due dates automatically based on interval.</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-900 block mb-1">2. Remind</span>
                    <p className="text-emerald-700">Send 1-click WhatsApp messages via wa.me click-to-chat.</p>
                  </div>
                  <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-900 block mb-1">3. Book</span>
                    <p className="text-indigo-700">Track customer responses and mark appointments as booked.</p>
                  </div>
                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
                    <span className="font-bold text-purple-900 block mb-1">4. Repeat</span>
                    <p className="text-purple-700">Marking complete logs revenue and auto-schedules the next visit.</p>
                  </div>
                </div>

                {/* Interactive Hands-On Tutorial Progress */}
                <div className="pt-2 p-5 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 rounded-2xl border border-blue-200/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                        <h3 className="font-bold text-sm text-gray-900">Interactive Hands-On Tutorial</h3>
                        {tutorialState.isCompleted ? (
                          <Badge variant="success">Completed</Badge>
                        ) : tutorialState.isActive ? (
                          <Badge variant="primary">
                            Lesson {tutorialState.currentLesson} of {TUTORIAL_LESSONS.length}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Not Started</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Learn by doing each action directly inside the app: add a customer, send WhatsApp reminders, record bookings, and review revenue.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!tutorialState.isCompleted && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            resumeTutorial();
                            const currentLesson = TUTORIAL_LESSONS.find((l) => l.id === tutorialState.currentLesson);
                            router.push(currentLesson?.route || '/dashboard');
                          }}
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                        >
                          Resume Tutorial
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRedoModalOpen(true)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5 text-gray-600" />}
                      >
                        Redo Tutorial
                      </Button>
                    </div>
                  </div>

                  {/* 6 Lessons Checklist */}
                  <div className="space-y-2.5">
                    {TUTORIAL_LESSONS.map((lesson) => {
                      const isDone = tutorialState.isCompleted || tutorialState.currentLesson > lesson.id;
                      const isCurrent = !tutorialState.isCompleted && tutorialState.isActive && tutorialState.currentLesson === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-start justify-between p-3.5 rounded-xl border transition-colors ${
                            isCurrent
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-200'
                              : isDone
                              ? 'bg-emerald-50/40 border-emerald-200/70'
                              : 'bg-white border-gray-200/80 text-gray-500'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isCurrent ? (
                                <span className="flex h-2.5 w-2.5 relative m-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                                </span>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className={`text-xs font-semibold ${isCurrent ? 'text-blue-950 font-bold' : isDone ? 'text-gray-900' : 'text-gray-700'}`}>
                                Lesson {lesson.id}: {lesson.title}
                              </p>
                              <p className="text-[11px] text-gray-500 leading-normal">
                                {lesson.shortDescription}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 ml-3">
                            {isDone ? (
                              <Badge variant="success">Done</Badge>
                            ) : isCurrent ? (
                              <Badge variant="primary">In Progress</Badge>
                            ) : (
                              <Badge variant="neutral">Not Done</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Import CSV Quick Link */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-gray-900">Need to import an existing customer ledger?</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Upload any Excel/CSV sheet with names and phone numbers.</p>
                  </div>
                  <Link href="/import" className="shrink-0">
                    <Button variant="outline" size="sm" leftIcon={Upload} className="w-full sm:w-auto">
                      Import CSV
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Developer Diagnostics (Dev Only) */}
            {isDev && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Developer Diagnostics</CardTitle>
                      <CardDescription>
                        Visible only in development mode.
                      </CardDescription>
                    </div>
                    <Badge variant={isDatabaseMode ? 'success' : 'warning'}>
                      {isDatabaseMode ? 'Cloud PostgreSQL' : 'Local Storage Demo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-gray-700">User: {user ? user.email : 'None'}</p>
                    <p className="font-semibold text-gray-700">Business: {business.name}</p>
                    <p className="font-semibold text-gray-700">Industry: {business.industry}</p>
                  </div>
                  {!isDatabaseMode && (
                    <div className="pt-2">
                      {showResetConfirm ? (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                          <p className="font-bold text-amber-900">Reset local workspace to initial Kochi AC demo data?</p>
                          <p className="text-amber-800 text-[11px]">This will replace your current demo customers with starter sample records.</p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                resetDemoData();
                                setShowResetConfirm(false);
                                toast.success('Sample dataset reset successfully.');
                              }}
                            >
                              Yes, Reset Dataset
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowResetConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowResetConfirm(true)}
                          leftIcon={RotateCcw}
                        >
                          Reset Sample Dataset
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal: Redo Tutorial Confirmation */}
      <Modal
        isOpen={isRedoModalOpen}
        onClose={() => setIsRedoModalOpen(false)}
        title="Restart Interactive Tutorial?"
        icon={<RotateCcw className="w-5 h-5 text-blue-600" />}
        size="md"
      >
        <div className="py-2 space-y-3 text-xs text-gray-600">
          <p>
            This will reset your tutorial progress back to <strong>Lesson 1: Add your first customer</strong> and open the dashboard.
          </p>
          <p>
            You can practice the full 6-step loop again at any time.
          </p>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRedoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsRedoModalOpen(false);
                redoTutorial();
                router.push('/dashboard');
              }}
            >
              Restart from Lesson 1
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete Workspace & DPDP Act Data Erasure Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeleteConfirmText('');
            setDeleteError(null);
          }
        }}
        title="Permanently Delete Workspace & All Data?"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        size="md"
      >
        <div className="py-2 space-y-4 text-xs text-gray-600">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-red-900">
            <p className="font-bold flex items-center gap-1.5 text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              Irreversible Action (DPDP Act 2023 Compliance)
            </p>
            <p className="text-[11px] leading-relaxed text-red-700">
              This will permanently purge your shop profile, <strong>{customers.length} customer records</strong>, all equipment, service histories, reminders, and custom WhatsApp message templates from our active database.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              To confirm, type your business name <span className="font-mono font-bold text-gray-900 select-all">&quot;{business.name}&quot;</span> below:
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder={business.name}
              disabled={isDeleting}
              className="font-mono text-xs"
            />
          </div>

          {deleteError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={deleteConfirmText.trim().toLowerCase() !== (business.name || '').trim().toLowerCase()}
              onClick={handleDeleteWorkspace}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isDeleting ? 'Erasing Workspace...' : 'Permanently Delete Everything'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
