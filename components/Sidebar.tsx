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
  MessageSquare,
  BarChart2,
  Settings,
  Upload,
  Wrench,
  Sparkles,
  LogOut,
  LogIn,
  Database,
  Cloud,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { services, business, isDatabaseMode, isLoadingDb, dbError } = useRenewalDesk();
  const { user, business: authBiz, signOut, isLoading: isAuthLoading, isConfigured } = useAuth();

  // Calculate live count of Overdue items needing urgent attention
  const overdueCount = services.filter(s => s.urgency === 'OVERDUE' && s.followUpStatus !== 'COMPLETED').length;
  const todayCount = services.filter(s => s.urgency === 'DUE_TODAY' && s.followUpStatus !== 'COMPLETED').length;
  const totalAttentionCount = overdueCount + todayCount;

  const navItems = [
    { label: 'Follow-up Queue', href: '/dashboard', icon: LayoutDashboard, badge: totalAttentionCount > 0 ? totalAttentionCount : undefined, badgeColor: 'bg-red-500' },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'CSV Import', href: '/import', icon: Upload },
    { label: 'WhatsApp Templates', href: '/templates', icon: MessageSquare },
    { label: 'Results & Revenue', href: '/results', icon: BarChart2 },
    { label: 'Service Cycles', href: '/services', icon: Wrench },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <BrandLogo
          variant="mark"
          size="sm"
          href="/dashboard"
          subtitle="Customer Recovery"
          priority
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.badgeColor || 'bg-blue-600'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Marketing / Pitch Pill */}
      <div className="p-3">
        <Link
          href="/"
          className="block p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-left hover:border-blue-200 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>ROI Calculator</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-snug">
            See how much repeat revenue your customer list can recover.
          </p>
        </Link>
      </div>

      {/* Logged-in Business Footer Card */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isConfigured && isAuthLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {(business.name || authBiz?.name || (isConfigured ? 'RD' : 'KC')).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {isConfigured && isAuthLoading ? (
                <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {business.name || authBiz?.name || (isConfigured ? 'My Workspace' : 'Kochi Chill AC Care')}
                </p>
              )}
              <div className="flex items-center gap-1 text-[10px]">
                {dbError ? (
                  <span className="text-red-600 font-semibold flex items-center gap-0.5">
                    <Cloud className="w-3 h-3 text-red-500" />
                    Database Error
                  </span>
                ) : isConfigured && isAuthLoading ? (
                  <span className="text-blue-600 font-medium flex items-center gap-0.5">
                    <Cloud className="w-3 h-3 text-blue-500 animate-pulse" />
                    Connecting...
                  </span>
                ) : isConfigured && isLoadingDb ? (
                  <span className="text-blue-600 font-medium flex items-center gap-0.5">
                    <Cloud className="w-3 h-3 text-blue-500 animate-pulse" />
                    Loading records...
                  </span>
                ) : isDatabaseMode ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    Supabase Cloud
                  </span>
                ) : (
                  <span className="text-gray-400 font-medium">Demo Mode</span>
                )}
              </div>
            </div>
          </div>

          {user ? (
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/login"
              title="Sign in with your business account"
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
