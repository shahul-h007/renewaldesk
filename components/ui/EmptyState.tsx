'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps, ButtonIcon } from './Button';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: ButtonIcon;
    variant?: ButtonProps['variant'];
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: ButtonIcon;
  };
  tip?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tip,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-gray-200/80 shadow-2xs',
        className
      )}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 sm:mb-5 border border-blue-100 shadow-inner">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-gray-500 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'primary'}
              size="md"
              onClick={primaryAction.onClick}
              leftIcon={primaryAction.icon}
              className="w-full sm:w-auto"
            >
              {primaryAction.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={secondaryAction.onClick}
              leftIcon={secondaryAction.icon}
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {tip && (
        <div className="mt-6 pt-5 border-t border-gray-100 w-full max-w-xs">
          <p className="text-[11px] text-gray-400">
            <span className="font-semibold text-gray-500">Tip:</span> {tip}
          </p>
        </div>
      )}
    </div>
  );
}
