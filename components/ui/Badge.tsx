import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'whatsapp';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'sm', dot = false, children, ...props }, ref) => {
    const variants = {
      neutral: 'bg-gray-100 text-gray-700 border-gray-200/80',
      primary: 'bg-blue-50 text-blue-700 border-blue-200',
      success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      warning: 'bg-amber-50 text-amber-800 border-amber-200',
      danger: 'bg-red-50 text-red-700 border-red-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      whatsapp: 'bg-emerald-50 text-[#128C7E] border-emerald-200',
    };

    const dotColors = {
      neutral: 'bg-gray-400',
      primary: 'bg-blue-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      purple: 'bg-purple-500',
      whatsapp: 'bg-[#25D366]',
    };

    const sizes = {
      sm: 'text-[11px] px-2 py-0.5 font-medium gap-1.5',
      md: 'text-xs px-2.5 py-1 font-semibold gap-2',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border whitespace-nowrap select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
        <span>{children}</span>
      </span>
    );
  }
);
Badge.displayName = 'Badge';
