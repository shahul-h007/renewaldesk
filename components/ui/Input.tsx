'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftAddon,
      rightAddon,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      id,
      disabled,
      required,
      containerClassName,
      ...props
    },
    ref
  ) => {
    // Generate an ID if not provided, for accessible label pairing
    const inputId = id || (typeof label === 'string' ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const helperId = helperText && inputId ? `${inputId}-helper` : undefined;

    return (
      <div className={cn('w-full text-left', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            <span className="inline-flex items-center px-3 min-h-[44px] rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium select-none">
              {leftAddon}
            </span>
          )}

          {LeftIcon && !leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center">
              <LeftIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={cn(
              // text-base on mobile prevents iOS auto-zoom, sm:text-sm for crisp desktop density
              'w-full min-h-[44px] px-3.5 py-2.5 bg-white text-gray-900 text-base sm:text-sm rounded-lg border transition-all duration-150',
              'placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 hover:border-gray-400 focus:border-blue-600 focus:ring-blue-600/20',
              leftAddon && 'rounded-l-none',
              rightAddon && 'rounded-r-none',
              LeftIcon && !leftAddon && 'pl-10',
              (RightIcon || error) && !rightAddon && 'pr-10',
              disabled && 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed select-none opacity-80',
              className
            )}
            {...props}
          />

          {rightAddon && (
            <span className="inline-flex items-center px-3 min-h-[44px] rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium select-none">
              {rightAddon}
            </span>
          )}

          {error && !rightAddon ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          ) : RightIcon && !rightAddon ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 pr-3.5 flex items-center">
              <RightIcon className="h-4 w-4 text-gray-400" />
            </div>
          ) : null}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1 text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
