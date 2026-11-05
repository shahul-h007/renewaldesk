'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
  ariaLabel?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className,
  ariaLabel = 'Navigation tabs',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('w-full max-w-full border-b border-gray-200 overflow-x-auto no-scrollbar', className)}>
        <nav
          className="flex space-x-6 min-w-max px-1"
          role="tablist"
          aria-label={ariaLabel}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'group inline-flex items-center gap-2 py-3.5 px-1 border-b-2 font-medium text-xs sm:text-sm min-h-[44px] transition-colors whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600',
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                )}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={cn(
                      'ml-1 px-2 py-0.5 text-[11px] font-semibold rounded-full transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Default 'pill' segmented control style
  return (
    <div className={cn('w-full max-w-full overflow-x-auto no-scrollbar py-1', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl min-w-max border border-gray-200/60"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all whitespace-nowrap select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600',
                isActive
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-3.5 h-3.5',
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
              )}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
