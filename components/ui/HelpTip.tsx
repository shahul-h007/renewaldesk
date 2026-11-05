'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export interface HelpTipProps {
  /** The text or ReactNode to display inside the tooltip */
  content: React.ReactNode;
  /** Optional title for the tooltip */
  title?: string;
  /** Placement relative to the trigger icon */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional CSS classes for trigger container */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** Icon size */
  size?: 'xs' | 'sm' | 'md';
}

export function HelpTip({
  content,
  title,
  placement = 'top',
  className = '',
  ariaLabel = 'More information',
  size = 'sm',
}: HelpTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    xs: 'w-3.5 h-3.5 text-[10px]',
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  // Placement styles
  const popoverPosition = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[placement];

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={title || ariaLabel}
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 p-0.5 ${sizeClasses}`}
      >
        <HelpCircle className={iconSizes} />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 p-3 bg-gray-900 text-white rounded-xl shadow-xl text-xs leading-relaxed animate-fade-in pointer-events-auto ${popoverPosition}`}
        >
          {title && (
            <div className="font-bold text-gray-100 mb-1 flex items-center justify-between">
              <span>{title}</span>
            </div>
          )}
          <div className="text-gray-300 font-normal">
            {content}
          </div>
          {/* Subtle pointer arrow */}
          {placement === 'top' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          )}
          {placement === 'bottom' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
          )}
        </div>
      )}
    </div>
  );
}
