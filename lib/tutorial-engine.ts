/**
 * RenewalDesk Tutorial Engine
 * 
 * Manages the reactive, event-based hands-on interactive tutorial.
 * Handles state persistence, validation, lesson progression, and practice customer tracking.
 */

import { TUTORIAL_LESSONS, getLessonById, getStepContent, TutorialLessonContent, TutorialStepContent } from './tutorial-content';
import { normalizePhoneNumber } from './csv-import';

export interface TutorialState {
  isActive: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  currentLesson: number; // 1 to 6
  currentStep: number;   // 0-based index within current lesson
  practiceCustomerId: string | null;
  practiceServiceId: string | null;
  completedLessons: number[]; // e.g. [1, 2]
}

const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore private mode errors
  }
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore private mode errors
  }
  memoryStore[key] = value;
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore private mode errors
  }
  delete memoryStore[key];
}

export function resolveTutorialKey(businessId?: string): string {
  const sanitized = (businessId || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `rd_tutorial_v2_${sanitized}`;
}

export const INITIAL_TUTORIAL_STATE: TutorialState = {
  isActive: false,
  hasStarted: false,
  isCompleted: false,
  isSkipped: false,
  currentLesson: 1,
  currentStep: 0,
  practiceCustomerId: null,
  practiceServiceId: null,
  completedLessons: [],
};

export function getTutorialState(businessId?: string): TutorialState {
  const raw = safeGet(resolveTutorialKey(businessId));
  if (!raw) return { ...INITIAL_TUTORIAL_STATE };
  try {
    const parsed = JSON.parse(raw);
    return {
      isActive: Boolean(parsed.isActive),
      hasStarted: Boolean(parsed.hasStarted),
      isCompleted: Boolean(parsed.isCompleted),
      isSkipped: Boolean(parsed.isSkipped),
      currentLesson: Number(parsed.currentLesson) || 1,
      currentStep: Number(parsed.currentStep) || 0,
      practiceCustomerId: parsed.practiceCustomerId || null,
      practiceServiceId: parsed.practiceServiceId || null,
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    };
  } catch {
    return { ...INITIAL_TUTORIAL_STATE };
  }
}

export function saveTutorialState(businessId: string | undefined, state: TutorialState): void {
  safeSet(resolveTutorialKey(businessId), JSON.stringify(state));
}

/**
 * Starts the tutorial for the first time.
 * Marks hasStarted = true immediately so a refresh or later login NEVER auto-starts it again.
 */
export function startTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: true,
    hasStarted: true,
    isCompleted: false,
    isSkipped: false,
    currentLesson: current.currentLesson || 1,
    currentStep: current.currentStep || 0,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Skips the tutorial without losing position.
 * The user can resume anytime from Settings > Help & Tutorial.
 */
export function skipTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: false,
    isSkipped: true,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Resumes an unfinished tutorial from the saved lesson and step.
 */
export function resumeTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: true,
    isSkipped: false,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Resets the tutorial completely for "Redo tutorial" in Settings.
 * Resets progress back to Lesson 1, Step 0, clears completed list, and marks isActive = true.
 */
export function resetTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...INITIAL_TUTORIAL_STATE,
    isActive: true,
    hasStarted: true,
    practiceCustomerId: current.practiceCustomerId, // retain reference if user wants to reuse or clean up
    practiceServiceId: current.practiceServiceId,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Advances to the next step.
 * If the last step of a lesson is reached, marks the lesson as completed
 * and moves to Step 0 of the next lesson.
 * If the last lesson is finished, marks isCompleted = true.
 */
export function advanceTutorialStep(businessId?: string): TutorialState {
  const state = getTutorialState(businessId);
  const currentLessonData = getLessonById(state.currentLesson);
  if (!currentLessonData) return state;

  const maxSteps = currentLessonData.steps.length;

  if (state.currentStep + 1 < maxSteps) {
    // Advance within same lesson
    const next: TutorialState = {
      ...state,
      currentStep: state.currentStep + 1,
    };
    saveTutorialState(businessId, next);
    return next;
  }

  // Finished current lesson
  const completedLessons = Array.from(new Set([...state.completedLessons, state.currentLesson]));

  if (state.currentLesson < TUTORIAL_LESSONS.length) {
    // Advance to next lesson
    const next: TutorialState = {
      ...state,
      currentLesson: state.currentLesson + 1,
      currentStep: 0,
      completedLessons,
    };
    saveTutorialState(businessId, next);
    return next;
  }

  // All lessons completed
  const next: TutorialState = {
    ...state,
    isActive: false,
    isCompleted: true,
    completedLessons,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Moves to the previous step within the current lesson if possible.
 */
export function previousTutorialStep(businessId?: string): TutorialState {
  const state = getTutorialState(businessId);
  if (state.currentStep > 0) {
    const next: TutorialState = {
      ...state,
      currentStep: state.currentStep - 1,
    };
    saveTutorialState(businessId, next);
    return next;
  }
  return state;
}

/**
 * Stores the newly created practice customer ID and service ID.
 */
export function setPracticeCustomerInState(
  businessId: string | undefined,
  customerId: string,
  serviceId?: string
): TutorialState {
  const state = getTutorialState(businessId);
  const next: TutorialState = {
    ...state,
    practiceCustomerId: customerId,
    practiceServiceId: serviceId || state.practiceServiceId,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Marks the tutorial as finished.
 */
export function completeTutorial(businessId?: string): TutorialState {
  const state = getTutorialState(businessId);
  const allIds = TUTORIAL_LESSONS.map((l) => l.id);
  const next: TutorialState = {
    ...state,
    isActive: false,
    isCompleted: true,
    completedLessons: allIds,
  };
  saveTutorialState(businessId, next);
  return next;
}

// ============================================================================
// VALIDATION HELPERS (Event-based condition checks)
// ============================================================================

export function isValidCustomerName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2;
}

export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return true;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return true;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return true;
  }
  return false;
}

export function hasPlaceholderTag(text: string): boolean {
  if (!text) return false;
  return /\{\{[a-zA-Z0-9_]+\}\}/.test(text);
}
