'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { AddCustomerModal } from './AddCustomerModal';
import { Plus, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function TopHeader({ title, subtitle, headerActions }: TopHeaderProps) {
  const pathname = usePathname();
  const { resetDemoData, isDatabaseMode, isLoadingDb, dbError } = useRenewalDesk();
  const { isLoading: isAuthLoading, isConfigured, authError, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';
  // "Add Customer" button appears only on Today (/dashboard) and Customers (/customers)
  const showAddCustomerCta = pathname === '/dashboard' || pathname === '/customers';

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="min-w-0 pr-4">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-500 hidden sm:block truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Developer diagnostics: ONLY rendered in development mode */}
          {isDev && (
            <div className="hidden xl:flex items-center">
              {authError ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200" title={authError}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Dev: Auth Err
                </span>
              ) : dbError ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200" title={dbError}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Dev: DB Err
                </span>
              ) : isConfigured && (isAuthLoading || isLoadingDb) ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Dev: Syncing
                </span>
              ) : isDatabaseMode ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Dev: Supabase
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Dev: Demo Mode
                </span>
              )}
            </div>
          )}

          {headerActions}

          {/* Reset Demo Data shortcut for demo testing */}
          {!isDatabaseMode && isDev && (
            <button
              onClick={resetDemoData}
              title="Reset to Kochi AC demo dataset (dev only)"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Global "Add Customer" button: only on /dashboard and /customers, hidden on mobile (mobile uses FAB) */}
          {showAddCustomerCta && (
            <div className="hidden md:block" data-tour="tour-add-customer">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                leftIcon={Plus}
              >
                Add Customer
              </Button>
            </div>
          )}
        </div>
      </header>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}
