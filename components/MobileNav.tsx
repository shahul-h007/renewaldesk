'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import { LayoutDashboard, Users, Upload, BarChart2 } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { services } = useRenewalDesk();

  const attentionCount = services.filter(
    s => (s.urgency === 'OVERDUE' || s.urgency === 'DUE_TODAY') && s.followUpStatus !== 'COMPLETED'
  ).length;

  const items = [
    { label: 'Follow-ups', href: '/dashboard', icon: LayoutDashboard, badge: attentionCount > 0 ? attentionCount : undefined },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Import', href: '/import', icon: Upload },
    { label: 'Results', href: '/results', icon: BarChart2 },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-1 px-3 relative rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
