'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  Upload,
  MessageSquare,
  Wrench,
  CreditCard,
  LogOut,
  LogIn,
  Sparkles,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { services, business, isDatabaseMode, isLoadingDb, dbError } = useRenewalDesk();
  const { user, business: authBiz, signOut, isLoading: isAuthLoading, isConfigured } = useAuth();

  // Overdue + Due Today queue items needing attention
  const overdueCount = services.filter(s => s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED').length;
  const todayCount = services.filter(s => s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED').length;
  const totalAttentionCount = overdueCount + todayCount;

  // Primary 4 core navigation items
  const primaryNavItems = [
    {
      label: 'Today',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: totalAttentionCount > 0 ? totalAttentionCount : undefined,
      badgeColor: 'bg-red-500',
    },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Results', href: '/results', icon: BarChart2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  // Secondary tools (preserve instant access to existing routes)
  const secondaryNavItems = [
    { label: 'Services', href: '/services', icon: Wrench },
    { label: 'Templates', href: '/templates', icon: MessageSquare },
    { label: 'Billing', href: '/billing', icon: CreditCard },
    { label: 'Import CSV', href: '/import', icon: Upload },
  ];

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <aside className="hidden md:flex flex-col w-16 lg:w-60 bg-white border-r border-gray-200 h-screen sticky top-0 z-30 select-none transition-all duration-200">
      {/* Brand Header */}
      <div className="p-3 lg:p-4 border-b border-gray-100 flex items-center justify-center lg:justify-between min-h-[64px]">
        {/* Tablet view: collapsed icon logo */}
        <div className="lg:hidden flex items-center justify-center">
          <Link href="/dashboard" className="p-1 rounded-lg hover:bg-gray-100 transition-colors" title="RenewalDesk">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              RD
            </div>
          </Link>
        </div>

        {/* Desktop view: full logo mark */}
        <div className="hidden lg:block">
          <BrandLogo
            variant="mark"
            size="sm"
            href="/dashboard"
            subtitle="Customer Recovery"
            priority
          />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 lg:p-3 space-y-1 overflow-y-auto no-scrollbar">
        {/* Section Heading (desktop only) */}
        <div className="hidden lg:block px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Daily Operations
        </div>

        {/* Core 4 Operations */}
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center lg:justify-between px-2.5 lg:px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {/* Tablet badge overlay on icon */}
                  {item.badge !== undefined && (
                    <span className="lg:hidden absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden lg:inline">{item.label}</span>
              </div>

              {/* Desktop badge */}
              {item.badge !== undefined && (
                <span className={`hidden lg:inline-flex text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.badgeColor || 'bg-blue-600'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Divider & Secondary Tools */}
        <div className="pt-3 pb-1">
          <div className="border-t border-gray-100 mb-2" />
          <div className="hidden lg:block px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Shop Tools
          </div>
        </div>

        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center lg:justify-start gap-3 px-2.5 lg:px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ROI Calculator Pill (Desktop only) */}
      <div className="hidden lg:block p-3">
        <Link
          href="/"
          className="block p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-left hover:border-blue-200 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>ROI Calculator</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-snug">
            Estimate recoverable revenue from overdue customers.
          </p>
        </Link>
      </div>

      {/* Account & Profile Footer */}
      <div className="p-2 lg:p-3 border-t border-gray-100 bg-gray-50/70">
        <div className="flex items-center justify-center lg:justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isConfigured && isAuthLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
            ) : (
              <div
                className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                title={business.name || authBiz?.name || 'Workspace'}
              >
                {(business.name || authBiz?.name || (isConfigured ? 'RD' : 'KC')).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block min-w-0 flex-1">
              {isConfigured && isAuthLoading ? (
                <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {business.name || authBiz?.name || (isConfigured ? 'My Workspace' : 'Kochi Chill AC Care')}
                </p>
              )}

              {/* Developer diagnostics: ONLY shown in development mode */}
              {isDev && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{isDatabaseMode ? 'Cloud DB' : 'Demo Mode'}</span>
                  {dbError && <span className="text-red-500 font-semibold">(Err)</span>}
                </div>
              )}
            </div>
          </div>

          {user ? (
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              title="Sign in with your business account"
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
              aria-label="Sign In"
            >
              <LogIn className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
