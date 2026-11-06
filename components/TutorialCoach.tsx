'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTutorial } from './TutorialContext';
import { Button } from './ui/Button';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  CornerDownRight,
} from 'lucide-react';

export function TutorialCoach() {
  const {
    state,
    isActive,
    currentLessonConfig,
    currentStepConfig,
    skip,
    advance,
    back,
  } = useTutorial();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);

  const coachRef = useRef<HTMLDivElement>(null);

  // Detect mobile device (<768px) and visualViewport resize for on-screen keyboard
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (typeof window !== 'undefined' && window.visualViewport) {
        // If visual viewport height is noticeably smaller than window.innerHeight, keyboard is open
        const keyboardActive = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(keyboardActive);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkViewport);
      window.visualViewport.addEventListener('scroll', checkViewport);
    }

    return () => {
      window.removeEventListener('resize', checkViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkViewport);
        window.visualViewport.removeEventListener('scroll', checkViewport);
      }
    };
  }, []);

  // Locate the target element for the current step and scroll it into view
  const updateTargetElement = useCallback(() => {
    if (!isActive || !currentStepConfig) return;

    const selector = currentStepConfig.targetSelector;
    if (!selector) {
      setTargetRect(null);
      setTargetMissing(false);
      return;
    }

    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setTargetMissing(false);

      // Add spotlight highlight class
      el.classList.add('tutorial-target-highlight');

      // Scroll smoothly into view if off-screen
      if (
        rect.top < 60 ||
        rect.bottom > window.innerHeight - 80 ||
        rect.left < 0 ||
        rect.right > window.innerWidth
      ) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
      // Wait a moment for dynamic rendering before declaring target missing
      setTargetMissing(true);
    }
  }, [isActive, currentStepConfig]);

  useEffect(() => {
    if (!isActive) return;

    const cleanupTarget = () => {
      document.querySelectorAll('.tutorial-target-highlight').forEach((el) => {
        el.classList.remove('tutorial-target-highlight');
      });
    };

    cleanupTarget();
    const timer = setTimeout(updateTargetElement, 150);
    window.addEventListener('scroll', updateTargetElement, true);
    window.addEventListener('resize', updateTargetElement);

    return () => {
      clearTimeout(timer);
      cleanupTarget();
      window.removeEventListener('scroll', updateTargetElement, true);
      window.removeEventListener('resize', updateTargetElement);
    };
  }, [isActive, state.currentLesson, state.currentStep, updateTargetElement]);

  // Keyboard accessibility: Escape to skip tutorial
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, skip]);

  if (!isActive || !currentStepConfig || !currentLessonConfig) {
    return null;
  }

  const isFirstStep = state.currentStep === 0;
  const isLastLesson = state.currentLesson === 6;
  const isLastStep = state.currentStep === currentStepConfig.totalStepsInLesson - 1;

  // Placement for desktop popover
  let popoverStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (!isMobile && targetRect && !targetMissing) {
    const popoverWidth = 380;
    const popoverHeight = 220;
    const padding = 16;

    let top = targetRect.bottom + padding;
    let left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;

    if (currentStepConfig.placement === 'top' && targetRect.top > popoverHeight + padding) {
      top = targetRect.top - popoverHeight - padding;
    } else if (currentStepConfig.placement === 'right' && targetRect.right + popoverWidth + padding < window.innerWidth) {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.right + padding;
    } else if (currentStepConfig.placement === 'left' && targetRect.left > popoverWidth + padding) {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.left - popoverWidth - padding;
    }

    // Keep within viewport boundaries
    top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));

    popoverStyle = {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
      position: 'fixed',
    };
  }

  // Mobile positioning: bottom sheet normally, flips to top when virtual keyboard is open
  const mobileSheetPositionClass = isKeyboardOpen
    ? 'top-3 bottom-auto animate-slide-down'
    : 'bottom-3 top-auto animate-slide-up';

  return (
    <>
      {/* Global CSS for spotlight ring */}
      <style jsx global>{`
        .tutorial-target-highlight {
          position: relative;
          z-index: 60 !important;
          outline: 3px solid #2563eb !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25) !important;
          border-radius: 12px !important;
          transition: all 0.2s ease-in-out !important;
        }
      `}</style>

      {/* Subtle backdrop scrim that doesn't block interactions */}
      <div
        className="fixed inset-0 z-50 pointer-events-none bg-slate-900/15 backdrop-blur-[1px] transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* The Coach Card */}
      <div
        ref={coachRef}
        role="dialog"
        aria-live="polite"
        aria-label="Tutorial Guide"
        style={isMobile ? undefined : popoverStyle}
        className={`z-60 bg-white border border-blue-200/90 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
          isMobile
            ? `fixed inset-x-3 max-w-lg mx-auto ${mobileSheetPositionClass}`
            : 'w-[380px] max-w-[90vw]'
        }`}
      >
        {/* Header: Progress, Title & Skip button */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-white/20 text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                Lesson {state.currentLesson} of 6 · Step {state.currentStep + 1} of{' '}
                {currentStepConfig.totalStepsInLesson}
              </p>
              <p className="text-xs font-bold truncate leading-tight">
                {currentLessonConfig.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={skip}
            className="text-[11px] font-medium text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/15 transition-colors shrink-0"
            title="Skip tutorial (Esc)"
          >
            Skip tutorial
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>{currentStepConfig.stepTitle}</span>
            </h4>
            <p className="text-xs font-semibold text-blue-900 leading-snug">
              {currentStepConfig.instruction}
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {targetMissing && currentStepConfig.missingExplanation
                ? currentStepConfig.missingExplanation
                : currentStepConfig.explanation}
            </p>
          </div>

          {/* Optional Example Chip */}
          {currentStepConfig.example && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700">
              <span className="font-semibold text-blue-900">Example:</span>
              <span className="font-mono">{currentStepConfig.example}</span>
            </div>
          )}

          {/* Target Missing Notice */}
          {targetMissing && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Target not found on this view. You can tap Continue below to proceed without getting stuck.
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
            <div>
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStepConfig.secondaryButtonLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={advance}
                  className="text-xs h-8 px-2.5"
                >
                  {currentStepConfig.secondaryButtonLabel}
                </Button>
              )}

              {/* Show explicit advance button if buttonLabel is provided or if target is missing */}
              {(currentStepConfig.buttonLabel || targetMissing) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={advance}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  className="text-xs h-8 px-3"
                >
                  {currentStepConfig.buttonLabel || 'Continue'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
