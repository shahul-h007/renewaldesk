'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, headerActions, children }: AppShellProps) {
  const { dbError, reloadFromDb } = useRenewalDesk();
  const { user, business, isConfigured, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Do not let an authenticated cloud user operate against transient/local data
  // when no tenant workspace has been resolved yet.
  useEffect(() => {
    if (isConfigured && !isAuthLoading && user && !business && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [isConfigured, isAuthLoading, user, business, pathname, router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <TopHeader title={title} subtitle={subtitle} headerActions={headerActions} />
        {dbError && (
          <div role="alert" className="mx-4 sm:mx-8 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">Cloud data needs attention</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-800">{dbError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void reloadFromDb?.(); }}
                className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry sync
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
