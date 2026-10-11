'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface BrandLogoProps {
  /**
   * 'full': Complete horizontal logo image with Ribbon R + RenewalDesk wordmark (3:1 aspect ratio)
   * 'icon': Standalone Ribbon R symbol only (1:1 square aspect ratio)
   * 'mark': Standalone Ribbon R icon alongside accessible crisp HTML wordmark & optional subtitle
   */
  variant?: 'full' | 'icon' | 'mark';
  /**
   * Size presets ensuring proportional, non-distorted rendering
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Destination link (e.g. '/' or '/dashboard'). Set to undefined or '' to render without link.
   */
  href?: string;
  /**
   * Subtitle / tagline displayed below the brand name (in 'mark' variant)
   */
  subtitle?: string;
  /**
   * Whether to invert text for dark backgrounds (e.g., slate-900 footer)
   */
  invertText?: boolean;
  /**
   * Additional wrapper class name
   */
  className?: string;
  /**
   * Next.js priority loading for above-the-fold logos
   */
  priority?: boolean;
}

const FULL_LOGO_DIMENSIONS = {
  sm: { width: 120, height: 40, className: 'h-8 sm:h-9 w-auto' },
  md: { width: 156, height: 52, className: 'h-10 sm:h-11 w-auto' },
  lg: { width: 192, height: 64, className: 'h-12 sm:h-14 w-auto' },
  xl: { width: 240, height: 80, className: 'h-16 w-auto' },
};

const ICON_DIMENSIONS = {
  sm: { width: 28, height: 28, className: 'w-7 h-7' },
  md: { width: 36, height: 36, className: 'w-9 h-9' },
  lg: { width: 44, height: 44, className: 'w-11 h-11' },
  xl: { width: 56, height: 56, className: 'w-14 h-14' },
};

const TEXT_SIZES = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export function BrandLogo({
  variant = 'mark',
  size = 'md',
  href,
  subtitle,
  invertText = false,
  className = '',
  priority = false,
}: BrandLogoProps) {
  let content: React.ReactNode = null;

  if (variant === 'full') {
    const dim = FULL_LOGO_DIMENSIONS[size] || FULL_LOGO_DIMENSIONS.md;
    content = (
      <div className={`inline-flex items-center ${className}`}>
        <Image
          src="/brand/renewaldesk-logo.png"
          alt="RenewalDesk — Renew • Track • Stay Ahead"
          width={dim.width}
          height={dim.height}
          className={`${dim.className} object-contain`}
          priority={priority}
        />
      </div>
    );
  } else if (variant === 'icon') {
    const dim = ICON_DIMENSIONS[size] || ICON_DIMENSIONS.md;
    content = (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src="/brand/renewaldesk-icon.png"
          alt="RenewalDesk Logo Mark"
          width={dim.width}
          height={dim.height}
          className={`${dim.className} object-contain`}
          priority={priority}
        />
      </div>
    );
  } else {
    // variant === 'mark' (Ribbon R icon + crisp HTML wordmark)
    const dim = ICON_DIMENSIONS[size] || ICON_DIMENSIONS.md;
    const textSize = TEXT_SIZES[size] || TEXT_SIZES.md;

    content = (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <Image
          src="/brand/renewaldesk-icon.png"
          alt="RenewalDesk Icon"
          width={dim.width}
          height={dim.height}
          className={`${dim.className} object-contain shrink-0 group-hover:scale-105 transition-transform`}
          priority={priority}
        />
        <div className="min-w-0">
          <span
            className={`font-extrabold tracking-tight block leading-tight ${textSize} ${
              invertText ? 'text-white' : 'text-slate-900'
            }`}
          >
            Renewal<span className={invertText ? 'text-blue-400' : 'text-blue-600'}>Desk</span>
          </span>
          {subtitle && (
            <span
              className={`block text-[10px] sm:text-[11px] font-medium leading-tight truncate ${
                invertText ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group">
        {content}
      </Link>
    );
  }

  return <>{content}</>;
}
