'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface DropdownPortalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null> | HTMLElement | null;
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  align?: 'end' | 'start';
  zIndex?: number;
  dataTutorial?: string;
}

export interface DropdownCoords {
  top: number;
  left: number;
  isFlipped: boolean;
  maxHeight?: number;
}

/**
 * Pure coordinate calculator for portalled dropdowns.
 * Ensures the menu is strictly within viewport boundaries and flips upward
 * when space below the trigger button is insufficient.
 */
export function calculateDropdownCoords({
  triggerRect,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  align = 'end',
  gap = 6,
  padding = 8,
}: {
  triggerRect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  align?: 'end' | 'start';
  gap?: number;
  padding?: number;
}): DropdownCoords {
  const spaceBelow = viewportHeight - triggerRect.bottom - gap - padding;
  const spaceAbove = triggerRect.top - gap - padding;

  let top: number;
  let isFlipped = false;
  let maxHeight = Math.max(160, Math.min(420, viewportHeight - padding * 2));

  // Determine vertical placement: Below vs Above
  if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
    top = triggerRect.bottom + gap;
    isFlipped = false;
    maxHeight = Math.max(140, spaceBelow);
  } else {
    // Flip upward above the trigger button
    top = Math.max(padding, triggerRect.top - gap - menuHeight);
    isFlipped = true;
    maxHeight = Math.max(140, spaceAbove);
  }

  // Determine horizontal placement
  let left: number;
  if (align === 'start') {
    left = triggerRect.left;
  } else {
    // Align right edge of dropdown with right edge of trigger
    left = triggerRect.right - menuWidth;
  }

  // Clamp within horizontal viewport boundaries
  left = Math.max(padding, Math.min(left, viewportWidth - menuWidth - padding));

  return {
    top: Math.round(top),
    left: Math.round(left),
    isFlipped,
    maxHeight: Math.round(maxHeight),
  };
}

export function DropdownPortal({
  isOpen,
  onClose,
  triggerRef,
  children,
  className,
  minWidth = 208,
  align = 'end',
  zIndex = 9990,
  dataTutorial,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getTriggerElement = useCallback((): HTMLElement | null => {
    if (!triggerRef) return null;
    if ('current' in triggerRef) {
      return triggerRef.current;
    }
    return triggerRef;
  }, [triggerRef]);

  const updatePosition = useCallback(() => {
    const triggerEl = getTriggerElement();
    if (!triggerEl || typeof window === 'undefined') return;

    const triggerRect = triggerEl.getBoundingClientRect();

    // If trigger button is scrolled completely off-screen, dismiss menu
    if (triggerRect.bottom < 0 || triggerRect.top > window.innerHeight) {
      onClose();
      return;
    }

    const menuEl = menuRef.current;
    const menuWidth = menuEl ? menuEl.offsetWidth : minWidth;
    const menuHeight = menuEl ? menuEl.offsetHeight : 260;

    const calculated = calculateDropdownCoords({
      triggerRect,
      menuWidth,
      menuHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      align,
    });

    setCoords(calculated);
  }, [getTriggerElement, minWidth, align, onClose]);

  // Update position on open and monitor window resize/scroll
  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    const handleScroll = (e: Event) => {
      // Allow scrolling inside the menu itself without dismissing
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const triggerEl = getTriggerElement();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerEl &&
        !triggerEl.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, getTriggerElement]);

  if (!mounted || !isOpen) return null;

  const content = (
    <>
      {/* Invisible overlay to catch taps */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: zIndex - 1 }}
        aria-hidden="true"
      />

      {/* Portalled Dropdown Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        data-tutorial={dataTutorial}
        data-dropdown-portal="menu"
        data-flipped={coords?.isFlipped ? 'true' : 'false'}
        style={{
          position: 'fixed',
          top: coords ? `${coords.top}px` : '-9999px',
          left: coords ? `${coords.left}px` : '-9999px',
          maxHeight: coords?.maxHeight ? `${coords.maxHeight}px` : '400px',
          zIndex,
        }}
        onClick={(e) => {
          // Prevent click from bubbling outside
          e.stopPropagation();
        }}
        className={cn(
          'w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 text-xs text-gray-700 animate-slide-up overflow-y-auto overscroll-contain select-none focus:outline-none',
          className
        )}
      >
        {children}
      </div>
    </>
  );

  return createPortal(content, document.body);
}
