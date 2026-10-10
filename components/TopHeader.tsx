'use client';

import React, { useState } from 'react';
import { useRenewalDesk } from '@/lib/store';
import { AddCustomerModal } from './AddCustomerModal';
import { Plus, RotateCcw, Search, Sparkles } from 'lucide-react';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function TopHeader({ title, subtitle, headerActions }: TopHeaderProps) {
  const { resetDemoData, isDatabaseMode } = useRenewalDesk();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 hidden sm:block">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          {isDatabaseMode ? (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PostgreSQL Cloud
            </span>
          ) : (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Demo Mode
            </span>
          )}

          {headerActions}

          {/* Reset Demo Data shortcut for demo mode testing */}
          {!isDatabaseMode && (
            <button
              onClick={resetDemoData}
              title="Reset to Kochi AC demo dataset"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Quick Add Customer CTA */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </header>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}
