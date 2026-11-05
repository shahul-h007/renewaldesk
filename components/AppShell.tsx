'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { AddCustomerModal } from './AddCustomerModal';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, headerActions, children }: AppShellProps) {
  const { dbError, reloadFromDb } = useRenewalDesk();
  const { user, business, isConfigured, isLoading: isAuthLoading, authError, refreshBusinessContext } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileAddModal, setShowMobileAddModal] = useState(false);

  // Show Mobile FAB only on Today (/dashboard) and Customers (/customers)
  const showMobileFab = pathname === '/dashboard' || pathname === '/customers';

  // Do not let an authenticated cloud user operate against transient/local data
  // when no tenant workspace has been resolved yet.
  useEffect(() => {
    if (isConfigured && !isAuthLoading && user && !business && !authError && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [isConfigured, isAuthLoading, user, business, authError, pathname, router]);

  return (
    <div className="flex min-h-screen bg-gray-50/80">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        <TopHeader title={title} subtitle={subtitle} headerActions={headerActions} />

        {(dbError || authError) && (
          <div role="alert" className="mx-4 sm:mx-8 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">{authError ? 'Sign-in needs attention' : 'Connection needs attention'}</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-800">Please check your network connection and retry.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (authError) void refreshBusinessContext();
                  else void reloadFromDb?.();
                }}
                className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 min-h-[44px] min-w-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {authError ? 'Retry sign-in' : 'Retry sync'}
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Floating Action Button (FAB) for "Add Customer" (Only on Today and Customers) */}
      {showMobileFab && (
        <button
          type="button"
          onClick={() => setShowMobileAddModal(true)}
          aria-label="Add New Customer"
          data-tour="tour-add-customer"
          className="md:hidden fixed bottom-20 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all focus:outline-hidden focus:ring-4 focus:ring-blue-500/30"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Mobile Add Customer Modal */}
      <AddCustomerModal
        isOpen={showMobileAddModal}
        onClose={() => setShowMobileAddModal(false)}
      />
    </div>
  );
}
