'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      label,
      error,
      helperText,
      options,
      id,
      disabled,
      required,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const selectId = id || (typeof label === 'string' ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = error && selectId ? `${selectId}-error` : undefined;
    const helperId = helperText && selectId ? `${selectId}-helper` : undefined;

    return (
      <div className={cn('w-full text-left', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={cn(
              // text-base on mobile prevents iOS auto-zoom; sm:text-sm for crisp desktop density
              'w-full min-h-[44px] pl-3.5 pr-10 py-2.5 bg-white text-gray-900 text-base sm:text-sm rounded-lg border appearance-none transition-all duration-150',
              'focus:outline-hidden focus:ring-2 focus:ring-offset-0 cursor-pointer',
              error
                ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 hover:border-gray-400 focus:border-blue-600 focus:ring-blue-600/20',
              disabled && 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed select-none opacity-80',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400">
            {error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
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

Select.displayName = 'Select';
