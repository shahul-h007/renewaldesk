'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTutorial } from './TutorialContext';
import { Button } from './ui/Button';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  computeCoachPosition,
  Rect,
  CoachPositionResult,
} from '@/lib/tutorial-positioning';
import { TUTORIAL_LESSONS } from '@/lib/tutorial-content';

export function TutorialCoach() {
  const {
    state,
    isActive,
    currentLessonConfig,
    currentStepConfig,
    currentStepDef,
    isWelcomeOpen,
    dismissWelcome,
    startFromWelcome,
    isExitModalOpen,
    promptExit,
    confirmExit,
    cancelExit,
    isShaking,
    shakeMessage,
    triggerOutsideClickShake,
    skipStep,
    back,
    complete,
  } = useTutorial();

  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [modalRect, setModalRect] = useState<Rect | null>(null);
  const [isTargetInModal, setIsTargetInModal] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);
  const [coachDimensions, setCoachDimensions] = useState({ width: 380, height: 230 });

  const coachRef = useRef<HTMLDivElement>(null);

  // Mount hook for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile device (<768px) and visualViewport resize for on-screen keyboard
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      const isCompactHeight = mobile && window.innerHeight <= 550;
      const isVisualViewportShrunk = Boolean(
        typeof window !== 'undefined' &&
        window.visualViewport &&
        window.visualViewport.height < window.innerHeight * 0.75
      );

      setIsKeyboardOpen(isCompactHeight || isVisualViewportShrunk);
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

  // Measure actual coach card dimensions when rendered
  useEffect(() => {
    if (coachRef.current) {
      const rect = coachRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCoachDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }
  }, [state.currentLesson, state.currentStep, currentStepConfig, targetMissing, shakeMessage]);

  // Locate the target element for current step and scroll into view
  const updateTargetElement = useCallback(() => {
    if (!isActive || !currentStepConfig) return;

    const selector = currentStepConfig.targetSelector;
    const fallbackSelector = currentStepConfig.fallbackSelector;

    let el = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
    if (!el && fallbackSelector) {
      el = document.querySelector(fallbackSelector) as HTMLElement | null;
    }

    if (!el) {
      setTargetRect(null);
      setModalRect(null);
      setIsTargetInModal(false);
      setTargetMissing(true);
      return;
    }

    setTargetMissing(false);

    // Mark element as active tutorial target
    document.querySelectorAll('[data-tutorial-active-target]').forEach((prev) => {
      prev.removeAttribute('data-tutorial-active-target');
    });
    el.setAttribute('data-tutorial-active-target', 'true');

    // Check if target is inside an open modal dialog
    const modalEl = el.closest('[role="dialog"], [data-modal]') as HTMLElement | null;
    if (modalEl) {
      setIsTargetInModal(true);
      const mRect = modalEl.getBoundingClientRect();
      setModalRect({
        top: Math.round(mRect.top),
        left: Math.round(mRect.left),
        right: Math.round(mRect.right),
        bottom: Math.round(mRect.bottom),
        width: Math.round(mRect.width),
        height: Math.round(mRect.height),
      });
    } else {
      setIsTargetInModal(false);
      setModalRect(null);
    }

    // Scroll into view if not already visible with generous clearance from header (60px) and bottom nav (64px)
    const rect = el.getBoundingClientRect();
    const isVisibleInViewport =
      rect.top >= 60 &&
      rect.bottom <= (window.innerHeight - (window.innerWidth < 768 ? 64 : 20));

    if (isKeyboardOpen) {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (!isVisibleInViewport) {
      const alignBlock = currentStepConfig?.placement === 'top' ? 'end' : 'start';
      el.scrollIntoView({ behavior: 'smooth', block: alignBlock });
    }

    // Capture bounding client rect
    const updatedRect = el.getBoundingClientRect();
    setTargetRect({
      top: Math.round(updatedRect.top),
      left: Math.round(updatedRect.left),
      right: Math.round(updatedRect.right),
      bottom: Math.round(updatedRect.bottom),
      width: Math.round(updatedRect.width),
      height: Math.round(updatedRect.height),
    });
  }, [isActive, currentStepConfig, isKeyboardOpen]);

  // Poll for target element when step changes or on scroll/resize
  useEffect(() => {
    if (!isActive) return;

    updateTargetElement();
    const interval = setInterval(updateTargetElement, 300);

    const handleScrollOrResize = () => {
      requestAnimationFrame(updateTargetElement);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isActive, updateTargetElement]);

  if (!mounted) return null;

  // -------------------------------------------------------------------------
  // 1. WELCOME MODAL (Start / Stop)
  // -------------------------------------------------------------------------
  if (isWelcomeOpen) {
    return createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5 animate-scale-up">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold text-gray-900">Welcome to RenewalDesk!</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Take the 5-minute interactive tutorial to see how easy it is to add customers, send 1-click WhatsApp reminders, and track bookings.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={startFromWelcome}
              className="w-full text-sm font-semibold justify-center py-3 min-h-[44px]"
            >
              Take 5-Minute Tutorial (Recommended)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissWelcome}
              className="w-full text-xs text-gray-500 hover:text-gray-700 min-h-[36px]"
            >
              Skip, I&apos;ll explore myself
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // -------------------------------------------------------------------------
  // 2. EXIT CONFIRMATION MODAL
  // -------------------------------------------------------------------------
  if (isExitModalOpen) {
    return createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 space-y-4 animate-scale-up">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-gray-900">Leave the tutorial?</h3>
            <p className="text-xs text-gray-600">
              You can restart or resume it anytime in <strong>Settings &gt; Help &amp; Tutorial</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={cancelExit}
              className="flex-1 text-xs min-h-[44px]"
            >
              Continue Tutorial
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={confirmExit}
              className="flex-1 text-xs bg-red-600 hover:bg-red-700 min-h-[44px]"
            >
              Exit Tutorial
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!isActive || !currentLessonConfig || !currentStepConfig) {
    return null;
  }

  // Calculate position coordinates
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;

  const pos: CoachPositionResult = computeCoachPosition({
    targetRect,
    modalRect,
    coachSize: coachDimensions,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
      isKeyboardOpen,
    },
    preferredPlacement: currentStepConfig.placement || 'bottom',
  });

  const isFirstStep = state.currentLesson === 1 && state.currentStep === 0;
  const isLastLesson = state.currentLesson === 8;
  const isFinishStep = isLastLesson && state.currentStep === currentLessonConfig.steps.length - 1;

  // Cutout hole coordinates
  const hole = targetRect
    ? {
        x: Math.max(0, targetRect.left - 6),
        y: Math.max(0, targetRect.top - 6),
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null;

  return createPortal(
    <div id="tutorial-portal-root" className="tutorial-system-root">
      <style>{`
        [data-tutorial-active-target="true"] {
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative;
          z-index: 9997 !important;
        }
      `}</style>
      {/* ------------------------------------------------------------------- */}
      {/* SVG SPOTLIGHT OVERLAY WITH CUTOUT HOLE (Focus Lock, Never Trapped)   */}
      {/* ------------------------------------------------------------------- */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        style={{ zIndex: 9995 }}
        onClick={triggerOutsideClickShake}
        aria-hidden="true"
      >
        <defs>
          <mask id="tutorial-spotlight-mask">
            {/* White covers entire screen */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black hole cuts out the target */}
            {hole && (
              <rect
                x={hole.x}
                y={hole.y}
                width={hole.width}
                height={hole.height}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dimmed backdrop with cutout hole */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.60)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </svg>

      {/* Target focus ring overlay */}
      {hole && (
        <div
          className="fixed pointer-events-none rounded-xl ring-2 ring-blue-500/80 shadow-lg animate-pulse"
          style={{
            zIndex: 9996,
            left: `${hole.x}px`,
            top: `${hole.y}px`,
            width: `${hole.width}px`,
            height: `${hole.height}px`,
          }}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* COACH CARD (Always on top, collision-free, keyboard-adaptive)       */}
      {/* ------------------------------------------------------------------- */}
      <div
        ref={coachRef}
        data-tutorial="coach-card" data-tutorial-coach="card"
        className={`fixed bg-white rounded-2xl shadow-2xl border border-gray-200/90 text-gray-900 overflow-hidden transition-all duration-200 ${
          isShaking ? 'animate-shake ring-2 ring-amber-400' : ''
        }`}
        style={
          isMobile
            ? pos.placement === 'bottom-sheet'
              ? {
                  zIndex: 9999,
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  maxWidth: 'calc(100vw - 24px)',
                }
              : {
                  zIndex: 9999,
                  top: `${pos.top}px`,
                  left: '12px',
                  right: '12px',
                  maxWidth: 'calc(100vw - 24px)',
                }
            : {
                zIndex: 9999,
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                width: `${coachDimensions.width}px`,
                maxWidth: 'calc(100vw - 24px)',
              }
        }
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/70 border-b border-blue-100/70">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] font-bold text-blue-900 truncate">
              Lesson {state.currentLesson} of {TUTORIAL_LESSONS.length} &middot; Step{' '}
              {state.currentStep + 1} of {currentLessonConfig.steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={promptExit}
            className="p-1 -mr-1 text-gray-400 hover:text-gray-700 hover:bg-blue-100/50 rounded-lg transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
            title="Exit tutorial"
            aria-label="Exit tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shake / Focus Lock Warning Banner */}
        {shakeMessage && (
          <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{shakeMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 space-y-2.5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 leading-snug">
              {currentStepConfig.stepTitle}
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              {currentStepConfig.instruction}
            </p>
          </div>

          {currentStepConfig.explanation && !isKeyboardOpen && (
            <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              {currentStepConfig.explanation}
            </p>
          )}

          {currentStepConfig.example && (
            <div className="text-[11px] bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-blue-800 font-mono">
              <span className="font-semibold font-sans text-blue-900">Example: </span>
              {currentStepConfig.example}
            </div>
          )}

          {targetMissing && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Target element not found
              </p>
              <p className="text-[10px] leading-relaxed">
                {currentStepConfig.missingExplanation ||
                  'The expected element is not visible on this screen. Tap "Skip this step" to proceed.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer controls: Back, Skip this step, Primary Action */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50/80 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={back}
              disabled={isFirstStep}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              className="text-xs min-h-[36px] sm:min-h-[32px] px-2.5"
            >
              Back
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={skipStep}
              className="text-xs text-gray-600 hover:text-gray-900 min-h-[36px] sm:min-h-[32px] px-2"
            >
              Skip
            </Button>
          </div>

          {isFinishStep ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => complete(false)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 min-h-[36px] sm:min-h-[32px]"
              >
                Delete Practice
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => complete(true)}
                className="text-xs min-h-[36px] sm:min-h-[32px]"
              >
                Keep &amp; Finish
              </Button>
            </div>
          ) : (
            currentStepConfig.buttonLabel && (
              <Button
                variant="primary"
                size="sm"
                onClick={skipStep}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                className="text-xs min-h-[36px] sm:min-h-[32px]"
              >
                {currentStepConfig.buttonLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
