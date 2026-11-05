'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { LayoutDashboard, Users, BarChart2, Settings } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { services } = useRenewalDesk();

  const attentionCount = services.filter(
    s => (s.urgency === 'OVERDUE' || s.urgency === 'DUE_TODAY') && s.followUpStatus !== 'COMPLETED'
  ).length;

  // 4 canonical primary destinations
  const items = [
    {
      label: 'Today',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: attentionCount > 0 ? attentionCount : undefined,
    },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Results', href: '/results', icon: BarChart2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 pt-1 pb-safe shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/settings' && ['/services', '/templates', '/billing'].includes(pathname));
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.href === '/results' ? 'tour-results-link' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 relative rounded-xl min-h-[48px] select-none transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
