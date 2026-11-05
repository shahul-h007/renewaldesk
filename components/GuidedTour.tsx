'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  TOUR_STEPS,
  TourStep,
  setTourCompleted,
  setTourSkipped,
} from '@/lib/tour-config';
import { Button } from './ui/Button';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  initialStepIndex?: number;
}

export function GuidedTour({
  isOpen,
  onClose,
  businessId,
  initialStepIndex = 0,
}: GuidedTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStep: TourStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  // Navigate to step route if not already on it
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    if (currentStep.route && pathname !== currentStep.route) {
      router.push(currentStep.route);
    }
  }, [isOpen, currentStep, pathname, router]);

  // Locate the target element on the current page
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Ensure element is visible in viewport if off-screen
      if (
        rect.top < 0 ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.right > window.innerWidth
      ) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    // Run lookup with slight delay for route rendering
    const timer = setTimeout(updateTargetRect, 100);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, stepIndex, pathname, updateTargetRect]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setTourCompleted(businessId);
      onClose();
    } else {
      setStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }
  }, [isLastStep, businessId, onClose]);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSkip = useCallback(() => {
    setTourSkipped(businessId);
    onClose();
  }, [businessId, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        // Prevent enter if focus is inside an input
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstStep) {
          e.preventDefault();
          handleBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstStep, handleBack, handleNext, handleSkip]);

  if (!isOpen) return null;

  // Calculate desktop popover coordinates relative to target element
  let popoverStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (targetRect) {
    const popoverWidth = 360;
    const popoverHeight = 220;
    const padding = 16;

    let top = targetRect.bottom + padding;
    let left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;

    // Placement adjustments
    if (currentStep.placement === 'top' && targetRect.top > popoverHeight + padding) {
      top = targetRect.top - popoverHeight - padding;
    } else if (currentStep.placement === 'right' && targetRect.right + popoverWidth + padding < window.innerWidth) {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.right + padding;
    } else if (currentStep.placement === 'left' && targetRect.left > popoverWidth + padding) {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.left - popoverWidth - padding;
    }

    // Keep within window viewport boundaries
    left = Math.max(padding, Math.min(left, window.innerWidth - popoverWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - popoverHeight - padding));

    popoverStyle = {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="RenewalDesk Interactive Guide"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* Dimmed backdrop */}
      <div
        onClick={handleSkip}
        className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-fade-in"
      />

      {/* Target Element Spotlight (Desktop only) */}
      {targetRect && (
        <div
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="hidden md:block absolute rounded-2xl ring-4 ring-blue-500/80 ring-offset-2 ring-offset-black/50 pointer-events-none transition-all duration-300 animate-pulse"
        />
      )}

      {/* ============================================================== */}
      {/* DESKTOP POPOVER (≥ md) */}
      {/* ============================================================== */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="hidden md:block absolute w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200/90 p-5 z-50 animate-scale-up"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              <Sparkles className="w-3 h-3" />
              <span>{currentStep.badgeText || `Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Close tour"
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">
          {currentStep.title}
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Step dots & Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={ChevronLeft}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={isLastStep ? CheckCircle2 : ChevronRight}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM SHEET (< md) */}
      {/* ============================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-200/80 p-5 pb-safe z-50 animate-slide-up">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
            <Sparkles className="w-3 h-3" />
            <span>{currentStep.badgeText || `Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}</span>
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1"
          >
            Skip
          </button>
        </div>

        <h3 className="font-bold text-gray-900 text-base mb-1.5">
          {currentStep.title}
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-2 pt-2">
          {!isFirstStep && (
            <Button
              variant="outline"
              size="md"
              onClick={handleBack}
              leftIcon={ChevronLeft}
              className="flex-1 min-h-[44px]"
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            rightIcon={isLastStep ? CheckCircle2 : ChevronRight}
            className="flex-1 min-h-[44px]"
          >
            {isLastStep ? 'Got it! Finish' : 'Next step'}
          </Button>
        </div>
      </div>
    </div>
  );
}
