'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getSafeInternalRedirect } from '@/lib/auth-utils';
import {
  RotateCw,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo');
  const safeRedirect = getSafeInternalRedirect(rawRedirect, '/dashboard');
  const isSetupRequired = searchParams.get('setup') === 'required';

  const { signInWithEmail, signInWithGoogle, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      // Check whether user already has an active business membership
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberRows } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('user_id', user.id)
            .limit(1);

          if (!memberRows || memberRows.length === 0) {
            router.push('/onboarding');
            return;
          }
        }
      } catch (checkErr) {
        console.warn('Membership check fallback:', checkErr);
      }

      router.push(safeRedirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during sign in.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle(safeRedirect);
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google sign in.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-60" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top back navigation */}
      <div className="w-full max-w-5xl mx-auto mb-6 relative z-10 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-white/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to RenewalDesk</span>
        </Link>
        <Link
          href="/demo"
          className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors"
        >
          Explore Sample Demo
        </Link>
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left/Main Column: Sign In Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <RotateCw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                  Renewal<span className="text-blue-600">Desk</span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  Service Retention & Follow-up Queue
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to your business
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Enter your business credentials to access your daily customer queue and WhatsApp reminders.
              </p>
            </div>

            {/* Supabase configuration alerts */}
            {isSetupRequired && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Authentication Required</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  You attempted to open a protected business workspace. Sign in to your verified account, or explore the isolated interactive demo.
                </p>
              </div>
            )}

            {!isConfigured && (
              <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Cloud Database Configuration Pending</span>
                </div>
                <p className="text-blue-800 leading-relaxed text-[11px]">
                  Supabase environment variables are being connected. While credentials are established, you can test the full retention workflow on the isolated public demo.
                </p>
                <div className="pt-1">
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900 text-xs underline"
                  >
                    <span>Launch Live Sample Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || !isConfigured}
                className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all ${
                  (!isConfigured || isGoogleLoading) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            <div className="my-5 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="owner@youracservice.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isConfigured}
                className={`w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 ${
                  (isLoading || !isConfigured) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Don&apos;t have an account?{' '}
              <Link
                href={rawRedirect ? `/signup?redirectTo=${encodeURIComponent(rawRedirect)}` : '/signup'}
                className="font-bold text-blue-600 hover:text-blue-800"
              >
                Start 14-day free trial
              </Link>
            </div>
            <Link href="/demo" className="text-slate-600 hover:text-blue-600 font-medium">
              View sample demo &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Desktop Value Proposition Showcase */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 rounded-2xl p-8 text-white flex-col justify-between border border-slate-800 relative overflow-hidden shadow-xl">
          {/* Subtle glow circle */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-semibold mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Tenant Cloud Security</span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white mb-3">
              Never let a profitable renewal slip through the cracks.
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              RenewalDesk automatically schedules next service due dates and queues pre-written WhatsApp outreach so your techs stay fully booked.
            </p>

            {/* Feature bullets */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Priority Due Queue</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Categorized by Overdue, Due Today, and Due This Week.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">1-Click WhatsApp Outreach</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pre-filled with customer equipment history and direct booking link.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Automatic Rescheduling</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Marking complete automatically schedules the next cycle (90, 180, or 365 days).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Row Level Security (RLS) guarantees complete data isolation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading sign in...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
