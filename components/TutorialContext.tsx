'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import {
  TutorialState,
  TutorialStepContext,
  TutorialStepDef,
  getTutorialState,
  saveTutorialState,
  startTutorial,
  skipTutorial,
  skipTutorialStep,
  resumeTutorial,
  resetTutorial,
  advanceTutorialStep,
  previousTutorialStep,
  setPracticeCustomerInState,
  completeTutorial as completeEngineTutorial,
  markTutorialOffered,
  getStepDef,
  TUTORIAL_STEP_DEFS,
} from '@/lib/tutorial-engine';
import {
  TUTORIAL_LESSONS,
  TutorialLessonContent,
  TutorialStepContent,
  getLessonById,
  getStepContent,
} from '@/lib/tutorial-content';

interface TutorialContextValue {
  state: TutorialState;
  isActive: boolean;
  currentLessonConfig?: TutorialLessonContent;
  currentStepConfig?: TutorialStepContent;
  currentStepDef?: TutorialStepDef;
  
  // Welcome Card Modal (Start / Stop)
  isWelcomeOpen: boolean;
  dismissWelcome: () => void;
  startFromWelcome: () => void;

  // Exit Confirmation Modal
  isExitModalOpen: boolean;
  promptExit: () => void;
  confirmExit: () => void;
  cancelExit: () => void;

  // Focus Lock Shake Warning
  isShaking: boolean;
  shakeMessage: string | null;
  triggerOutsideClickShake: () => void;

  // Modal Sync Flags for Self-Healing
  isAddCustomerModalOpen: boolean;
  setIsAddCustomerModalOpen: (open: boolean) => void;
  isAddCustomerModalRequested: boolean;
  setIsAddCustomerModalRequested: (open: boolean) => void;
  isWhatsAppModalOpen: boolean;
  setIsWhatsAppModalOpen: (open: boolean) => void;
  isCompleteModalOpen: boolean;
  setIsCompleteModalOpen: (open: boolean) => void;
  isCustomTemplateOpen: boolean;
  setIsCustomTemplateOpen: (open: boolean) => void;
  isServiceModalOpen: boolean;
  setIsServiceModalOpen: (open: boolean) => void;

  // Actions
  start: () => void;
  skipStep: () => void;
  advance: () => void;
  back: () => void;
  resume: () => void;
  redo: () => void;
  complete: (keepPracticeCustomer?: boolean) => Promise<void>;
  setPracticeCustomer: (customerId: string, serviceId?: string) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const store = useRenewalDesk();
  const businessId = store.business?.id;

  const [state, setState] = useState<TutorialState>(() => getTutorialState(businessId));
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [shakeMessage, setShakeMessage] = useState<string | null>(null);

  // Modal synchronizers
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCustomTemplateOpen, setIsCustomTemplateOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state whenever businessId changes
  useEffect(() => {
    const s = getTutorialState(businessId);
    setState(s);
  }, [businessId]);

  // Check once-only auto-offer welcome card on first dashboard load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = getTutorialState(businessId);
    if (!s.hasBeenOffered && !s.hasStarted && !s.isCompleted && !s.isSkipped && pathname === '/dashboard') {
      setIsWelcomeOpen(true);
      const next = markTutorialOffered(businessId);
      setState(next);
    }
  }, [businessId, pathname]);

  const currentLessonConfig = useMemo(() => {
    return getLessonById(state.currentLesson);
  }, [state.currentLesson]);

  const currentStepConfig = useMemo(() => {
    return getStepContent(state.currentLesson, state.currentStep);
  }, [state.currentLesson, state.currentStep]);

  const currentStepDef = useMemo(() => {
    return getStepDef(state.currentLesson, state.currentStep);
  }, [state.currentLesson, state.currentStep]);

  // Construct context for step engine
  const stepContext: TutorialStepContext = useMemo(() => ({
    state,
    pathname,
    navigateTo: (route: string) => {
      if (pathname !== route) router.push(route);
    },
    modals: {
      isAddCustomerOpen: isAddCustomerModalOpen,
      setAddCustomerOpen: setIsAddCustomerModalOpen,
      isWhatsAppOpen: isWhatsAppModalOpen,
      setWhatsAppOpen: setIsWhatsAppModalOpen,
      isCompleteOpen: isCompleteModalOpen,
      setCompleteOpen: setIsCompleteModalOpen,
      isCustomTemplateOpen,
      setCustomTemplateOpen: setIsCustomTemplateOpen,
      isServiceModalOpen,
      setServiceModalOpen: setIsServiceModalOpen,
    },
    store: {
      customers: store.customers || [],
      services: store.services || [],
      templates: store.templates || [],
      catalog: store.catalog || [],
      addCustomer: store.addCustomer,
      hardDeleteCustomer: store.hardDeleteCustomer,
      deleteCustomer: store.deleteCustomer,
      updateFollowUpStatus: store.updateFollowUpStatus,
    },
  }), [
    state,
    pathname,
    router,
    isAddCustomerModalOpen,
    isWhatsAppModalOpen,
    isCompleteModalOpen,
    isCustomTemplateOpen,
    isServiceModalOpen,
    store,
  ]);

  // Self-healing: Run ensure() when step or route or modal state changes
  useEffect(() => {
    if (!state.isActive || !currentStepDef) return;

    // 1. Check if route matches
    if (currentStepDef.route && pathname !== currentStepDef.route) {
      router.push(currentStepDef.route);
      return;
    }

    // 2. Run step ensure
    if (currentStepDef.ensure) {
      currentStepDef.ensure(stepContext);
    }
  }, [state.isActive, state.currentLesson, state.currentStep, currentStepDef, pathname, router, stepContext]);

  // Check completeWhen automatically
  useEffect(() => {
    if (!state.isActive || !currentStepDef || !currentStepDef.completeWhen) return;
    try {
      if (currentStepDef.completeWhen(stepContext)) {
        // Auto-advance to next step
        const next = advanceTutorialStep(businessId);
        setState(next);
      }
    } catch {
      // Ignore
    }
  }, [state.isActive, currentStepDef, stepContext, businessId]);

  // Shake trigger for focus lock
  const triggerOutsideClickShake = useCallback(() => {
    setIsShaking(true);
    setShakeMessage('Finish this step first, or skip.');

    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
      setTimeout(() => setShakeMessage(null), 1500);
    }, 600);
  }, []);

  const start = useCallback(() => {
    const next = startTutorial(businessId);
    setState(next);
    setIsWelcomeOpen(false);
    if (next.currentLesson === 1) {
      setIsAddCustomerModalOpen(true);
    }
    router.push('/dashboard');
  }, [businessId, router]);

  const dismissWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
    const next = skipTutorial(businessId);
    setState(next);
  }, [businessId]);

  const startFromWelcome = useCallback(() => {
    start();
  }, [start]);

  const promptExit = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  const confirmExit = useCallback(() => {
    setIsExitModalOpen(false);
    const next = skipTutorial(businessId);
    setState(next);
    setIsAddCustomerModalOpen(false);
    setIsWhatsAppModalOpen(false);
    setIsCompleteModalOpen(false);
    setIsCustomTemplateOpen(false);
    setIsServiceModalOpen(false);
  }, [businessId]);

  const cancelExit = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  const skipStep = useCallback(() => {
    const next = skipTutorialStep(businessId);
    setState(next);
  }, [businessId]);

  const back = useCallback(() => {
    const next = previousTutorialStep(businessId);
    setState(next);
  }, [businessId]);

  const resume = useCallback(() => {
    const next = resumeTutorial(businessId);
    setState(next);
    const lesson = getLessonById(next.currentLesson);
    if (lesson?.route) router.push(lesson.route);
    if (next.currentLesson === 1 && next.currentStep < 7) {
      setIsAddCustomerModalOpen(true);
    }
  }, [businessId, router]);

  const redo = useCallback(() => {
    const next = resetTutorial(businessId);
    setState(next);
    setIsAddCustomerModalOpen(true);
    router.push('/dashboard');
  }, [businessId, router]);

  const setPracticeCustomer = useCallback(
    (customerId: string, serviceId?: string) => {
      const next = setPracticeCustomerInState(businessId, customerId, serviceId);
      setState(next);
    },
    [businessId]
  );

  const complete = useCallback(
    async (keepPracticeCustomer: boolean = true) => {
      if (!keepPracticeCustomer && state.practiceCustomerId) {
        try {
          if (store.hardDeleteCustomer) {
            await store.hardDeleteCustomer(state.practiceCustomerId);
          } else if (store.deleteCustomer) {
            store.deleteCustomer(state.practiceCustomerId);
          }
        } catch (err) {
          console.warn('Could not remove practice customer:', err);
        }
      }
      const next = completeEngineTutorial(businessId);
      setState(next);
      setIsAddCustomerModalOpen(false);
      setIsWhatsAppModalOpen(false);
      setIsCompleteModalOpen(false);
    },
    [businessId, state.practiceCustomerId, store]
  );

  const value = useMemo(
    () => ({
      state,
      isActive: state.isActive,
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
      isAddCustomerModalOpen,
      setIsAddCustomerModalOpen,
      isAddCustomerModalRequested: isAddCustomerModalOpen,
      setIsAddCustomerModalRequested: setIsAddCustomerModalOpen,
      isWhatsAppModalOpen,
      setIsWhatsAppModalOpen,
      isCompleteModalOpen,
      setIsCompleteModalOpen,
      isCustomTemplateOpen,
      setIsCustomTemplateOpen,
      isServiceModalOpen,
      setIsServiceModalOpen,
      start,
      skipStep,
      advance: skipStep,
      back,
      resume,
      redo,
      complete,
      setPracticeCustomer,
    }),
    [
      state,
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
      isAddCustomerModalOpen,
      setIsAddCustomerModalOpen,
      isWhatsAppModalOpen,
      isCompleteModalOpen,
      isCustomTemplateOpen,
      isServiceModalOpen,
      start,
      skipStep,
      back,
      resume,
      redo,
      complete,
      setPracticeCustomer,
    ]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__rd_tutorial = {
        getState: () => getTutorialState(businessId),
        setState: (newState: any) => {
          saveTutorialState(businessId, newState);
          setState(newState);
        },
        advanceStep: skipStep,
        previousStep: back,
        skipStep,
        start,
        promptExit,
        confirmExit,
        cancelExit,
        openAddCustomerModal: () => setIsAddCustomerModalOpen(true),
        closeAddCustomerModal: () => setIsAddCustomerModalOpen(false),
        openWhatsAppModal: () => setIsWhatsAppModalOpen(true),
        closeWhatsAppModal: () => setIsWhatsAppModalOpen(false),
        openCompleteModal: () => setIsCompleteModalOpen(true),
        closeCompleteModal: () => setIsCompleteModalOpen(false),
        openServiceModal: () => setIsServiceModalOpen(true),
        closeServiceModal: () => setIsServiceModalOpen(false),
        openCustomTemplateModal: () => setIsCustomTemplateOpen(true),
        closeCustomTemplateModal: () => setIsCustomTemplateOpen(false),
        triggerOutsideClickShake,
      };
    }
  }, [
    businessId,
    skipStep,
    back,
    start,
    promptExit,
    confirmExit,
    cancelExit,
    triggerOutsideClickShake,
  ]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return ctx;
}
