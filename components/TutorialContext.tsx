'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRenewalDesk } from '@/lib/store';
import {
  TutorialState,
  getTutorialState,
  startTutorial,
  skipTutorial,
  resumeTutorial,
  resetTutorial,
  advanceTutorialStep,
  previousTutorialStep,
  setPracticeCustomerInState,
  completeTutorial,
  INITIAL_TUTORIAL_STATE,
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
  isAddCustomerModalRequested: boolean;
  setIsAddCustomerModalRequested: (requested: boolean) => void;
  start: () => void;
  skip: () => void;
  advance: () => void;
  back: () => void;
  resume: () => void;
  redo: () => void;
  complete: () => void;
  setPracticeCustomer: (customerId: string, serviceId?: string) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { business } = useRenewalDesk();
  const businessId = business?.id;

  const [state, setState] = useState<TutorialState>(() => getTutorialState(businessId));
  const [isAddCustomerModalRequested, setIsAddCustomerModalRequested] = useState<boolean>(false);

  // Sync state whenever businessId changes
  useEffect(() => {
    setState(getTutorialState(businessId));
  }, [businessId]);

  const currentLessonConfig = useMemo(() => {
    return getLessonById(state.currentLesson);
  }, [state.currentLesson]);

  const currentStepConfig = useMemo(() => {
    return getStepContent(state.currentLesson, state.currentStep);
  }, [state.currentLesson, state.currentStep]);

  // Navigate to the lesson's target route if tutorial is active
  useEffect(() => {
    if (!state.isActive || !currentLessonConfig) return;
    if (currentLessonConfig.route && pathname !== currentLessonConfig.route) {
      router.push(currentLessonConfig.route);
    }
  }, [state.isActive, currentLessonConfig, pathname, router]);

  // If in Lesson 1, request AddCustomerModal to be open
  useEffect(() => {
    if (state.isActive && state.currentLesson === 1 && state.currentStep < 7) {
      setIsAddCustomerModalRequested(true);
    }
  }, [state.isActive, state.currentLesson, state.currentStep]);

  const start = useCallback(() => {
    const next = startTutorial(businessId);
    setState(next);
    if (next.currentLesson === 1) {
      setIsAddCustomerModalRequested(true);
    }
    router.push('/dashboard');
  }, [businessId, router]);

  const skip = useCallback(() => {
    const next = skipTutorial(businessId);
    setState(next);
    setIsAddCustomerModalRequested(false);
  }, [businessId]);

  const resume = useCallback(() => {
    const next = resumeTutorial(businessId);
    setState(next);
    if (next.currentLesson === 1 && next.currentStep < 7) {
      setIsAddCustomerModalRequested(true);
    }
    const lesson = getLessonById(next.currentLesson);
    if (lesson?.route) {
      router.push(lesson.route);
    }
  }, [businessId, router]);

  const redo = useCallback(() => {
    const next = resetTutorial(businessId);
    setState(next);
    setIsAddCustomerModalRequested(true);
    router.push('/dashboard');
  }, [businessId, router]);

  const advance = useCallback(() => {
    const next = advanceTutorialStep(businessId);
    setState(next);
    if (next.currentLesson !== 1) {
      setIsAddCustomerModalRequested(false);
    }
  }, [businessId]);

  const back = useCallback(() => {
    const next = previousTutorialStep(businessId);
    setState(next);
  }, [businessId]);

  const setPracticeCustomer = useCallback(
    (customerId: string, serviceId?: string) => {
      const next = setPracticeCustomerInState(businessId, customerId, serviceId);
      setState(next);
    },
    [businessId]
  );

  const complete = useCallback(() => {
    const next = completeTutorial(businessId);
    setState(next);
    setIsAddCustomerModalRequested(false);
  }, [businessId]);

  const value = useMemo(
    () => ({
      state,
      isActive: state.isActive,
      currentLessonConfig,
      currentStepConfig,
      isAddCustomerModalRequested,
      setIsAddCustomerModalRequested,
      start,
      skip,
      advance,
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
      isAddCustomerModalRequested,
      start,
      skip,
      advance,
      back,
      resume,
      redo,
      complete,
      setPracticeCustomer,
    ]
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return ctx;
}
