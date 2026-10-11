import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Scale,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | RenewalDesk',
  description:
    'Read the Terms of Service governing your use of RenewalDesk, including acceptable use, customer messaging compliance, and platform responsibilities.',
};

export default function TermsOfServicePage() {
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
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy Policy
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
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span><strong>Effective Date:</strong> October 2026</span>
            <span>•</span>
            <span><strong>Last Updated:</strong> October 2026</span>
            <span>•</span>
            <span><strong>App URL:</strong> https://renewaldesk-dun.vercel.app</span>
          </div>

          <p className="mt-5 text-sm text-slate-600 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the RenewalDesk web application (&ldquo;RenewalDesk&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing the website, registering an account, or using our tools, you agree to comply with and be bound by these Terms.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 leading-relaxed text-slate-700 text-sm">
        {/* Section 1: What RenewalDesk Does */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              1. What RenewalDesk Does
            </h2>
          </div>

          <p>
            RenewalDesk is a software-as-a-service application designed for recurring service businesses, independent technicians, and repair shops (such as air conditioning, water purifier, electrical, CCTV, home appliance, and equipment maintenance providers).
          </p>

          <p>
            The platform provides workflow management features including:
          </p>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
            <li>Customer and equipment asset record tracking.</li>
            <li>Configurable service cadences (e.g., 30, 90, 180, or 365 days) and next due date calculations.</li>
            <li>A daily follow-up queue categorizing due dates (Overdue, Due Today, Due This Week, Due This Month).</li>
            <li>One-click pre-formatted WhatsApp message links generated on your device to streamline customer contact.</li>
          </ul>
        </section>

        {/* Section 2: Account Security & Business Access */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              2. Account Registration &amp; Security
            </h2>
          </div>

          <p>
            To use RenewalDesk, you must register a business workspace using email and password or Google Sign-In. You agree to:
          </p>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
            <li>Provide accurate and complete registration and business profile details.</li>
            <li>Maintain the confidentiality and security of your account credentials.</li>
            <li>Promptly notify us if you discover or suspect unauthorized access to your workspace.</li>
            <li>Accept full responsibility for all activities occurring under your account or by team members authorized to access your business workspace.</li>
          </ul>
        </section>

        {/* Section 3: Acceptable Use & Customer Messaging Compliance */}
        <section className="bg-white rounded-2xl border-2 border-amber-500/30 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              3. Acceptable Use &amp; Messaging Compliance
            </h2>
          </div>

          <p>
            RenewalDesk empowers service professionals to retain loyal customers. You represent, warrant, and agree that:
          </p>

          <div className="space-y-3 pt-1 text-xs sm:text-sm text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block">Existing Customer Consent:</strong>
              <span>
                You will only enter customer names and phone numbers for individuals with whom you have an existing commercial relationship or who have explicitly consented to receive routine maintenance follow-up notices from your business.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block">Anti-Spam Policy:</strong>
              <span>
                You may not use RenewalDesk to facilitate unsolicited bulk messaging, cold marketing blasts, deceptive promotions, or harassment. You agree to respect customer requests to opt out of future communications.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block">Third-Party &amp; Legal Compliance:</strong>
              <span>
                You are solely responsible for ensuring your WhatsApp communications comply with WhatsApp&apos;s Terms of Service, Acceptable Use Policies, and all applicable national and local telecommunications laws.
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Data Accuracy & Customer Follow-Up Responsibilities */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              4. Data Accuracy &amp; Service Delivery Responsibilities
            </h2>
          </div>

          <p>
            RenewalDesk automates recurrence math and reminder scheduling based entirely on information you enter or import:
          </p>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
            <li>
              <strong>Verification Before Sending:</strong> You are solely responsible for verifying customer phone numbers, equipment models, service history, pricing, and the final wording of WhatsApp messages prior to initiating contact.
            </li>
            <li>
              <strong>Physical Service Responsibility:</strong> RenewalDesk is an administrative software tool. We do not dispatch technicians, perform maintenance, guarantee technical workmanship, or act as an intermediary for service contracts between you and your customers.
            </li>
            <li>
              <strong>Data Accuracy:</strong> You are responsible for ensuring that all imported customer, appliance, and scheduling data is accurate and up to date.
            </li>
          </ul>
        </section>

        {/* Section 5: Service Availability, Disclaimers & Limitations */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              5. Service Availability, Disclaimers &amp; Limitation of Liability
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                &ldquo;As Is&rdquo; and &ldquo;As Available&rdquo; Provision
              </h3>
              <p>
                RenewalDesk is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                No Revenue or Business Guarantees
              </h3>
              <p>
                Revenue figures, recoverable income calculations, and retention percentages shown on our homepage or ROI calculator are purely illustrative mathematical models based on your selected assumptions. They do not constitute a guarantee of income, business success, or customer responsiveness.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Third-Party Platform Dependencies
              </h3>
              <p>
                RenewalDesk relies on third-party cloud infrastructure (including Supabase, Vercel, and WhatsApp/Meta). We are not liable for any downtime, outages, API changes, message delivery delays, or network failures caused by these third-party providers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Limitation of Liability
              </h3>
              <p>
                To the maximum extent permitted by applicable law, RenewalDesk and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits, revenue, data, or goodwill arising out of your access to or use of the application.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Pricing, Free Trials & Cancellation */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              6. Pricing, Free Trials &amp; Cancellation
            </h2>
          </div>

          <p>
            Regarding fees, subscriptions, and trials on RenewalDesk:
          </p>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside">
            <li>
              <strong>Pricing Tiers:</strong> The website displays illustrative monthly subscription plans (Starter, Growth, Business) and features available for business tiers.
            </li>
            <li>
              <strong>Current Billing Status:</strong> Automated recurring payment gateway processing and credit card charging are not currently active on the platform. Workspace access is provided without automated charges unless explicitly authorized during commercial onboarding.
            </li>
            <li>
              <strong>No Long-Term Contracts:</strong> Users may stop using the service or close their account at any time without cancellation penalties.
            </li>
          </ul>
        </section>

        {/* Section 7: Termination & Account Closure */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              7. Termination &amp; Account Suspension
            </h2>
          </div>

          <p>
            You may terminate your account at any time by requesting deletion of your workspace. We reserve the right to suspend or terminate accounts that violate these Terms, engage in unsolicited spamming, or attempt to compromise platform security.
          </p>
        </section>

        {/* Section 8: Governing Law & Contact */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              8. Governing Law &amp; Contact Information
            </h2>
          </div>

          <p>
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in Kochi, Kerala, India (or the verified operating jurisdiction of the business).
          </p>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5 text-slate-700">
            <div><strong>Product:</strong> RenewalDesk SaaS Platform</div>
            <div><strong>Operating Location:</strong> Kochi, Kerala, India</div>
            <div>
              <strong>Questions or Inquiries:</strong>{' '}
              <a
                href="mailto:support@renewaldesk.com"
                className="font-bold text-blue-700 hover:text-blue-900 underline"
              >
                support@renewaldesk.com
              </a>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              <em>Note: Official entity name and contact details should be confirmed prior to formal legal enforcement.</em>
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
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-blue-400 font-bold hover:text-white transition-colors">Terms of Service</Link>
          </div>

          <p className="text-slate-500 text-[11px]">
            © 2026 RenewalDesk. Built for service centers in Kochi, Kerala &amp; beyond.
          </p>
        </div>
      </footer>
    </div>
  );
}
