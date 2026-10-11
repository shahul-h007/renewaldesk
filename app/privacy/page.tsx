import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import {
  ShieldCheck,
  Lock,
  Database,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Server,
  Share2,
  Trash2,
  FileText,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | RenewalDesk',
  description:
    'Learn how RenewalDesk collects, uses, and safeguards account, business, and customer data, with strict multi-tenant isolation and zero access to Google Gmail or Drive.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo variant="mark" size="md" href="/" priority />

          <nav className="flex items-center gap-3 sm:gap-6 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors hidden sm:inline-block">
              Home
            </Link>
            <Link href="/demo" className="hover:text-blue-600 transition-colors hidden sm:inline-block">
              Live Demo
            </Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
            >
              Log In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to RenewalDesk</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data Protection & Privacy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span><strong>Effective Date:</strong> October 2026</span>
            <span>•</span>
            <span><strong>Last Updated:</strong> October 2026</span>
            <span>•</span>
            <span><strong>App URL:</strong> https://renewaldesk-dun.vercel.app</span>
          </div>

          <p className="mt-5 text-sm text-slate-600 leading-relaxed">
            RenewalDesk (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides a software-as-a-service customer retention platform designed for service and equipment maintenance businesses. This Privacy Policy outlines how your personal, business, and customer information is collected, processed, stored, and protected when you access RenewalDesk.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 leading-relaxed text-slate-700 text-sm">
        {/* Section 1: Information Collected */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              1. Information We Collect
            </h2>
          </div>

          <p>
            RenewalDesk collects only the information necessary to provide account access, calculate service recurrence schedules, and generate customer WhatsApp follow-up reminders:
          </p>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                A. Account &amp; Authentication Information
              </h3>
              <p className="text-xs text-slate-600">
                When you create an account using email and password, we collect your email address and securely store an encrypted hash of your password via Supabase Authentication. When you authenticate using Google Sign-In, we collect your name, email address, and profile picture provided by Google.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                B. Business Profile Data
              </h3>
              <p className="text-xs text-slate-600">
                During workspace onboarding, you provide your business name, industry/business type (e.g., Air Conditioning, RO Water Purifier, Home Appliances), contact telephone number, business address, preferred currency (e.g., Indian Rupee ₹), and timezone.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                C. Customer, Equipment &amp; Service Records
              </h3>
              <p className="text-xs text-slate-600">
                You input or import records regarding your service clients. This includes customer names, contact phone numbers, service addresses, and optional notes; equipment details such as appliance type, brand, model, and installation date; and service records indicating service types, recurrence intervals (e.g., 30, 90, 180, or 365 days), last completed service dates, and next calculated due dates.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                D. Technical &amp; Operational Telemetry
              </h3>
              <p className="text-xs text-slate-600">
                We collect aggregate performance and reliability metrics using Vercel Speed Insights and Vercel Web Analytics. These tools measure page load speeds and traffic patterns without collecting personal identifiable information (PII) or using third-party tracking cookies across websites.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Google OAuth Scope Limitations (CRITICAL) */}
        <section className="bg-white rounded-2xl border-2 border-blue-500/30 p-6 sm:p-8 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Google Sign-In &amp; Explicit Scope Limitations
            </h2>
          </div>

          <p>
            RenewalDesk offers optional Google Sign-In powered by Supabase Auth for quick and secure account authentication. We adhere strictly to the principle of least privilege:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>What RenewalDesk Accesses</span>
              </div>
              <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                <li>Your basic Google identity profile: full name and email address.</li>
                <li>Your Google profile avatar URL (used solely to personalize your workspace header).</li>
                <li>Verification of your authenticated Google account session.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>What RenewalDesk Never Accesses</span>
              </div>
              <ul className="text-xs text-rose-800 space-y-1.5 list-disc list-inside">
                <li><strong>No Gmail access:</strong> We never read, send, or scan your emails.</li>
                <li><strong>No Google Drive access:</strong> We never view, upload, or manage files.</li>
                <li><strong>No Google Contacts access:</strong> We never read or sync your contact book.</li>
                <li><strong>No Google Calendar or Docs access:</strong> We do not request any Google Workspace tools.</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-600 pt-1">
            RenewalDesk requests only standard open authentication scopes (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">openid</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">profile</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">email</code>). We will never request or retain elevated Google Workspace permissions.
          </p>
        </section>

        {/* Section 3: How We Use Your Information */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              3. How We Use Collected Information
            </h2>
          </div>

          <p>
            Your information is used strictly to operate the RenewalDesk application on your behalf:
          </p>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
            <li>
              <strong>Service Recurrence Calculations:</strong> Computing upcoming due dates from maintenance cadences (e.g., quarterly AC filter cleanings, annual RO filter replacements).
            </li>
            <li>
              <strong>Follow-Up Queue Generation:</strong> Categorizing upcoming services into <span className="font-semibold text-slate-800">Overdue</span>, <span className="font-semibold text-slate-800">Due Today</span>, <span className="font-semibold text-slate-800">Due This Week</span>, and <span className="font-semibold text-slate-800">Due This Month</span>.
            </li>
            <li>
              <strong>Pre-Formatted WhatsApp Outreach:</strong> Populating your customized reminder message templates with customer names, equipment models, and due dates.
            </li>
            <li>
              <strong>Workspace Security &amp; Access Control:</strong> Authenticating users and verifying business memberships.
            </li>
            <li>
              <strong>Service Communications:</strong> Delivering critical system messages such as password reset links and account verification notices.
            </li>
          </ul>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900">
            <strong>Zero Data Monetization:</strong> RenewalDesk does not sell, rent, monetize, or trade your business data or customer phone numbers to third-party data brokers, marketing agencies, or advertisers.
          </div>
        </section>

        {/* Section 4: Data Storage, Architecture & Security */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              4. Data Storage &amp; Multi-Tenant Security Safeguards
            </h2>
          </div>

          <p>
            We implement security safeguards designed to keep your business records private and isolated:
          </p>

          <div className="space-y-3 pt-1 text-xs sm:text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">PostgreSQL Row Level Security (RLS):</strong> Our database enforces strict RLS policies on all business tables (customers, assets, service schedules, reminders, and templates). A business workspace can only access and modify records belonging to its verified <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">business_id</code>.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Encryption in Transit &amp; at Rest:</strong> All application traffic is encrypted in transit using industry-standard TLS / HTTPS. Stored records are managed on cloud database infrastructure with AES-256 encryption at rest.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Client-Side WhatsApp Architecture:</strong> RenewalDesk does not connect to the WhatsApp Cloud API or store WhatsApp account credentials. Reminders are generated as standard client-side <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">wa.me</code> deep links that open your personal or business WhatsApp app only when you click the button.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Open-Redirect Protection:</strong> Authentication and callback handlers strictly validate redirection targets against safe internal paths, preventing phishing redirects.
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Third-Party Service Providers */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              5. Third-Party Service Providers (Sub-Processors)
            </h2>
          </div>

          <p>
            RenewalDesk utilizes vetted infrastructure providers to operate the cloud service:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs">Supabase Inc.</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provides our managed PostgreSQL database, authentication system, user session tokens, and Row Level Security infrastructure.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs">Vercel Inc.</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hosts our web application edge deployment, executes serverless functions, and provides privacy-friendly Web Analytics and Speed Insights.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs">WhatsApp / Meta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recipient platform when you click to send pre-formatted WhatsApp messages from your device. RenewalDesk does not share database records directly with Meta.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Data Retention & Account Deletion */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              6. Data Retention &amp; Account Deletion
            </h2>
          </div>

          <p>
            We retain your business workspace data, customer records, and service schedules for as long as your account remains active, or until you request deletion.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
            <h3 className="font-bold text-slate-900">How to Request Deletion:</h3>
            <p>
              You may request complete deletion of your account and all associated customer, equipment, and service records at any time by emailing us at{' '}
              <a
                href="mailto:shahulhmd.connect@gmail.com"
                className="font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                shahulhmd.connect@gmail.com
              </a>
              . Upon verification of your account ownership, we will permanently purge your workspace records from our active database.
            </p>
          </div>
        </section>

        {/* Section 7: Contact Information */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              7. Contact Us
            </h2>
          </div>

          <p>
            If you have questions regarding this Privacy Policy, your data rights, or account deletion, please contact us:
          </p>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5 text-slate-700">
            <div><strong>Product:</strong> RenewalDesk Customer Retention SaaS</div>
            <div><strong>Operating Location:</strong> Kochi, Kerala, India</div>
            <div>
              <strong>Support &amp; Privacy Inquiries:</strong>{' '}
              <a
                href="mailto:shahulhmd.connect@gmail.com"
                className="font-bold text-blue-700 hover:text-blue-900 underline"
              >
                shahulhmd.connect@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-12 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandLogo
            variant="mark"
            size="sm"
            href="/"
            invertText
            subtitle="— Recurring Service Customer Retention"
          />

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/demo" className="hover:text-white transition-colors">Live Demo</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/privacy" className="text-blue-400 font-bold hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>

          <p className="text-slate-500 text-[11px]">
            © 2026 RenewalDesk. Built for service centers in Kochi, Kerala &amp; beyond.
          </p>
        </div>
      </footer>
    </div>
  );
}
