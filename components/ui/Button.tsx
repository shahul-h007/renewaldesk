'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonIcon = React.ReactNode | React.ComponentType<{ className?: string }>;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ButtonIcon;
  rightIcon?: ButtonIcon;
}

function renderButtonIcon(icon?: ButtonIcon, className?: string) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={className || 'w-4 h-4 shrink-0'} />;
  }
  return icon as React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all rounded-xl select-none focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-xs',
      secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400 border border-gray-200/80',
      outline: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border border-gray-300 shadow-2xs',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-xs',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-xs',
      whatsapp: 'bg-[#25D366] text-white hover:bg-[#1ebe57] focus:ring-[#25D366] shadow-xs active:bg-[#128C7E]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
      md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2', // Standard 44px touch target
      lg: 'text-base px-5 py-3 min-h-[48px] gap-2.5',
      icon: 'p-2.5 min-h-[44px] min-w-[44px] aspect-square', // 44px minimum for touch icons
    };

    const iconSizeClasses = {
      sm: 'w-3.5 h-3.5 shrink-0',
      md: 'w-4 h-4 shrink-0',
      lg: 'w-5 h-5 shrink-0',
      icon: 'w-5 h-5 shrink-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizeClasses[size])} />
        ) : (
          renderButtonIcon(leftIcon, iconSizeClasses[size])
        )}
        {children && <span>{children}</span>}
        {!isLoading && renderButtonIcon(rightIcon, iconSizeClasses[size])}
      </button>
    );
  }
);

Button.displayName = 'Button';
