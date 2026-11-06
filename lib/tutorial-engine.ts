/**
 * RenewalDesk Tutorial Engine
 * 
 * Manages the reactive, self-healing, event-based hands-on interactive tutorial.
 * Handles state persistence, focus lock, modal synchronization, step definitions,
 * and practice customer data tracking.
 */

import { TUTORIAL_LESSONS, getLessonById, getStepContent, TutorialStepContent } from './tutorial-content';
import { normalizePhoneNumber } from './csv-import';

export interface TutorialState {
  isActive: boolean;
  hasBeenOffered: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  currentLesson: number; // 1 to 8
  currentStep: number;   // 0-based index within current lesson
  practiceCustomerId: string | null;
  practiceServiceId: string | null;
  practiceTemplateId: string | null;
  practiceCustomServiceId: string | null;
  completedLessons: number[]; // e.g. [1, 2]
}

export interface TutorialStepContext {
  state: TutorialState;
  pathname: string;
  navigateTo: (route: string) => void;
  modals: {
    isAddCustomerOpen: boolean;
    setAddCustomerOpen: (open: boolean) => void;
    isWhatsAppOpen: boolean;
    setWhatsAppOpen: (open: boolean) => void;
    isCompleteOpen: boolean;
    setCompleteOpen: (open: boolean) => void;
    isCustomTemplateOpen: boolean;
    setCustomTemplateOpen: (open: boolean) => void;
    isServiceModalOpen: boolean;
    setServiceModalOpen: (open: boolean) => void;
  };
  store: {
    customers: any[];
    services: any[];
    templates: any[];
    catalog: any[];
    addCustomer?: (...args: any[]) => Promise<any> | any;
    hardDeleteCustomer?: (id: string) => Promise<any> | any;
    deleteCustomer?: (id: string) => void;
    updateCustomerServiceStatus?: (serviceId: string, status: any) => void;
    updateFollowUpStatus?: (serviceId: string, status: any) => void;
  };
}

export interface TutorialStepDef {
  id: string;
  lessonId: number;
  stepIndex: number;
  route: string;
  targetSelector: string;
  fallbackSelector?: string;
  allowedInteractionArea?: string;
  ensure?: (ctx: TutorialStepContext) => Promise<boolean> | boolean;
  completeWhen?: (ctx: TutorialStepContext) => boolean;
  canAdvanceManually?: boolean;
}

const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore private browsing restrictions
  }
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore private browsing restrictions
  }
  memoryStore[key] = value;
}

export function resolveTutorialKey(businessId?: string): string {
  const sanitized = (businessId || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `rd_tutorial_v3_${sanitized}`;
}

export const INITIAL_TUTORIAL_STATE: TutorialState = {
  isActive: false,
  hasBeenOffered: false,
  hasStarted: false,
  isCompleted: false,
  isSkipped: false,
  currentLesson: 1,
  currentStep: 0,
  practiceCustomerId: null,
  practiceServiceId: null,
  practiceTemplateId: null,
  practiceCustomServiceId: null,
  completedLessons: [],
};

export function getTutorialState(businessId?: string): TutorialState {
  const raw = safeGet(resolveTutorialKey(businessId));
  if (!raw) return { ...INITIAL_TUTORIAL_STATE };
  try {
    const parsed = JSON.parse(raw);
    return {
      isActive: Boolean(parsed.isActive),
      hasBeenOffered: Boolean(parsed.hasBeenOffered),
      hasStarted: Boolean(parsed.hasStarted),
      isCompleted: Boolean(parsed.isCompleted),
      isSkipped: Boolean(parsed.isSkipped),
      currentLesson: Math.max(1, Math.min(8, Number(parsed.currentLesson) || 1)),
      currentStep: Math.max(0, Number(parsed.currentStep) || 0),
      practiceCustomerId: parsed.practiceCustomerId || null,
      practiceServiceId: parsed.practiceServiceId || null,
      practiceTemplateId: parsed.practiceTemplateId || null,
      practiceCustomServiceId: parsed.practiceCustomServiceId || null,
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
 * Marks that the tutorial welcome prompt was offered to this workspace.
 * Guaranteed to run only once per workspace.
 */
export function markTutorialOffered(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    hasBeenOffered: true,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Starts the tutorial for the first time.
 */
export function startTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: true,
    hasBeenOffered: true,
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
 * Exits the tutorial immediately.
 */
export function exitTutorial(businessId?: string): TutorialState {
  return skipTutorial(businessId);
}

/**
 * Resumes the tutorial from the exact saved lesson and step.
 */
export function resumeTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: true,
    isSkipped: false,
    isCompleted: false,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Resets the tutorial back to Lesson 1, Step 0.
 */
export function resetTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...INITIAL_TUTORIAL_STATE,
    isActive: true,
    hasBeenOffered: true,
    hasStarted: true,
    currentLesson: 1,
    currentStep: 0,
    practiceCustomerId: current.practiceCustomerId,
    practiceServiceId: current.practiceServiceId,
    practiceTemplateId: current.practiceTemplateId,
    practiceCustomServiceId: current.practiceCustomServiceId,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Completes the tutorial.
 */
export function completeTutorial(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    isActive: false,
    isCompleted: true,
    isSkipped: false,
    completedLessons: [1, 2, 3, 4, 5, 6, 7, 8],
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Advances to the next step, automatically rolling over to the next lesson or completion.
 */
export function advanceTutorialStep(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  const lesson = getLessonById(current.currentLesson);
  if (!lesson) return current;

  let nextLesson = current.currentLesson;
  let nextStep = current.currentStep + 1;
  const completedLessons = [...current.completedLessons];

  if (nextStep >= lesson.steps.length) {
    if (!completedLessons.includes(current.currentLesson)) {
      completedLessons.push(current.currentLesson);
    }
    if (nextLesson < 8) {
      nextLesson += 1;
      nextStep = 0;
    } else {
      // Completed all 8 lessons
      return completeTutorial(businessId);
    }
  }

  const next: TutorialState = {
    ...current,
    currentLesson: nextLesson,
    currentStep: nextStep,
    completedLessons,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Moves back to the previous step or previous lesson.
 */
export function previousTutorialStep(businessId?: string): TutorialState {
  const current = getTutorialState(businessId);
  if (current.currentLesson === 1 && current.currentStep === 0) {
    return current;
  }

  let prevLesson = current.currentLesson;
  let prevStep = current.currentStep - 1;

  if (prevStep < 0) {
    prevLesson = Math.max(1, prevLesson - 1);
    const prevLessonConfig = getLessonById(prevLesson);
    prevStep = prevLessonConfig ? Math.max(0, prevLessonConfig.steps.length - 1) : 0;
  }

  const next: TutorialState = {
    ...current,
    currentLesson: prevLesson,
    currentStep: prevStep,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Skips the current step.
 */
export function skipTutorialStep(businessId?: string): TutorialState {
  return advanceTutorialStep(businessId);
}

/**
 * Records practice customer in state.
 */
export function setPracticeCustomerInState(
  businessId: string | undefined,
  customerId: string,
  serviceId?: string
): TutorialState {
  const current = getTutorialState(businessId);
  const next: TutorialState = {
    ...current,
    practiceCustomerId: customerId,
    practiceServiceId: serviceId || current.practiceServiceId,
  };
  saveTutorialState(businessId, next);
  return next;
}

/**
 * Validates 10-digit Indian mobile number.
 */
export function isValid10DigitIndianNumber(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(norm);
}

export function isValidCustomerName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2;
}

export function isValidIndianPhone(phone: string): boolean {
  return isValid10DigitIndianNumber(phone);
}

export function hasPlaceholderTag(text: string): boolean {
  return /\{\{[a-zA-Z0-9_]+\}\}/.test(text);
}

// ===========================================================================
// STEP ENGINE DEFINITIONS (Declarative, Self-Healing)
// ===========================================================================

export const TUTORIAL_STEP_DEFS: TutorialStepDef[] = [
  // --- LESSON 1: Add a customer ---
  {
    id: 'l1-s1-name',
    lessonId: 1,
    stepIndex: 0,
    route: '/dashboard',
    targetSelector: '[data-tutorial="customer-name"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: false,
  },
  {
    id: 'l1-s2-phone',
    lessonId: 1,
    stepIndex: 1,
    route: '/dashboard',
    targetSelector: '[data-tutorial="customer-phone"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: false,
  },
  {
    id: 'l1-s3-service',
    lessonId: 1,
    stepIndex: 2,
    route: '/dashboard',
    targetSelector: '[data-tutorial="service-type"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l1-s4-last-date',
    lessonId: 1,
    stepIndex: 3,
    route: '/dashboard',
    targetSelector: '[data-tutorial="last-service-date"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l1-s5-next-date',
    lessonId: 1,
    stepIndex: 4,
    route: '/dashboard',
    targetSelector: '[data-tutorial="next-due-date"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l1-s6-details',
    lessonId: 1,
    stepIndex: 5,
    route: '/dashboard',
    targetSelector: '[data-tutorial="additional-details"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l1-s7-save',
    lessonId: 1,
    stepIndex: 6,
    route: '/dashboard',
    targetSelector: '[data-tutorial="save-customer"]',
    allowedInteractionArea: '[data-modal="add-customer"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(true);
      return true;
    },
    completeWhen: (ctx) => {
      // Completed when practice customer is saved in store
      return Boolean(ctx.state.practiceCustomerId);
    },
    canAdvanceManually: false,
  },

  // --- LESSON 2: Today queue ---
  {
    id: 'l2-s1-find',
    lessonId: 2,
    stepIndex: 0,
    route: '/dashboard',
    targetSelector: '[data-tutorial="practice-customer-card"]',
    fallbackSelector: '[data-tutorial="today-queue"]',
    ensure: async (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (ctx.modals.isAddCustomerOpen) ctx.modals.setAddCustomerOpen(false);
      // Self-heal: ensure practice customer exists in store
      if (!ctx.state.practiceCustomerId && ctx.store.addCustomer) {
        try {
          const pastDate = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
          const newCust = await ctx.store.addCustomer({
            name: 'Arun Kumar (Practice)',
            phone: '9847123456',
            serviceType: 'Routine Maintenance',
            lastServiceDate: pastDate,
            notes: 'Tutorial practice customer',
          });
          if (newCust?.id) {
            setPracticeCustomerInState(undefined, newCust.id);
          }
        } catch {
          // Ignore
        }
      }
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l2-s2-tabs',
    lessonId: 2,
    stepIndex: 1,
    route: '/dashboard',
    targetSelector: '[data-tutorial="today-tabs"]',
    fallbackSelector: '[data-tutorial="today-queue"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 3: Send a WhatsApp reminder ---
  {
    id: 'l3-s1-tap-whatsapp',
    lessonId: 3,
    stepIndex: 0,
    route: '/dashboard',
    targetSelector: '[data-tutorial="whatsapp-btn"]',
    fallbackSelector: '[data-tutorial="practice-customer-card"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    completeWhen: (ctx) => ctx.modals.isWhatsAppOpen,
    canAdvanceManually: false,
  },
  {
    id: 'l3-s2-preview',
    lessonId: 3,
    stepIndex: 1,
    route: '/dashboard',
    targetSelector: '[data-tutorial="whatsapp-preview"]',
    allowedInteractionArea: '[data-modal="whatsapp"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isWhatsAppOpen) ctx.modals.setWhatsAppOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l3-s3-switch-template',
    lessonId: 3,
    stepIndex: 2,
    route: '/dashboard',
    targetSelector: '[data-tutorial="whatsapp-template-select"]',
    allowedInteractionArea: '[data-modal="whatsapp"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isWhatsAppOpen) ctx.modals.setWhatsAppOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l3-s4-send',
    lessonId: 3,
    stepIndex: 3,
    route: '/dashboard',
    targetSelector: '[data-tutorial="open-whatsapp-btn"]',
    allowedInteractionArea: '[data-modal="whatsapp"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (!ctx.modals.isWhatsAppOpen) ctx.modals.setWhatsAppOpen(true);
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 4: Track replies & bookings ---
  {
    id: 'l4-s1-more',
    lessonId: 4,
    stepIndex: 0,
    route: '/dashboard',
    targetSelector: '[data-tutorial="more-menu-btn"]',
    fallbackSelector: '[data-tutorial="practice-customer-card"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (ctx.modals.isWhatsAppOpen) ctx.modals.setWhatsAppOpen(false);
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s2-no-response',
    lessonId: 4,
    stepIndex: 1,
    route: '/dashboard',
    targetSelector: '[data-tutorial="menu-no-response"]',
    fallbackSelector: '[data-tutorial="more-menu-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s3-undo',
    lessonId: 4,
    stepIndex: 2,
    route: '/dashboard',
    targetSelector: '[data-tutorial="undo-action"]',
    fallbackSelector: '[data-tutorial="practice-customer-card"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s4-replied',
    lessonId: 4,
    stepIndex: 3,
    route: '/dashboard',
    targetSelector: '[data-tutorial="menu-replied"]',
    fallbackSelector: '[data-tutorial="more-menu-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s5-booked',
    lessonId: 4,
    stepIndex: 4,
    route: '/dashboard',
    targetSelector: '[data-tutorial="mark-booked-btn"]',
    fallbackSelector: '[data-tutorial="practice-customer-card"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s6-complete',
    lessonId: 4,
    stepIndex: 5,
    route: '/dashboard',
    targetSelector: '[data-tutorial="mark-completed-btn"]',
    fallbackSelector: '[data-tutorial="complete-submit"]',
    allowedInteractionArea: '[data-modal="complete-service"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l4-s7-not-interested',
    lessonId: 4,
    stepIndex: 6,
    route: '/dashboard',
    targetSelector: '[data-tutorial="practice-customer-card"]',
    fallbackSelector: '[data-tutorial="today-queue"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/dashboard') ctx.navigateTo('/dashboard');
      if (ctx.modals.isCompleteOpen) ctx.modals.setCompleteOpen(false);
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 5: Message templates ---
  {
    id: 'l5-s1-nav',
    lessonId: 5,
    stepIndex: 0,
    route: '/templates',
    targetSelector: '[data-tutorial="template-item"]',
    fallbackSelector: '[data-tutorial="templates-list"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l5-s2-edit',
    lessonId: 5,
    stepIndex: 1,
    route: '/templates',
    targetSelector: '[data-tutorial="template-body"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l5-s3-chip',
    lessonId: 5,
    stepIndex: 2,
    route: '/templates',
    targetSelector: '[data-tutorial="placeholder-chips"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l5-s4-save-edit',
    lessonId: 5,
    stepIndex: 3,
    route: '/templates',
    targetSelector: '[data-tutorial="save-template-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l5-s5-new',
    lessonId: 5,
    stepIndex: 4,
    route: '/templates',
    targetSelector: '[data-tutorial="new-template-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l5-s6-save-new',
    lessonId: 5,
    stepIndex: 5,
    route: '/templates',
    targetSelector: '[data-tutorial="save-custom-template-btn"]',
    fallbackSelector: '[data-tutorial="template-name"]',
    allowedInteractionArea: '[data-modal="custom-template"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/templates') ctx.navigateTo('/templates');
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 6: Services ---
  {
    id: 'l6-s1-nav',
    lessonId: 6,
    stepIndex: 0,
    route: '/services',
    targetSelector: '[data-tutorial="service-item"]',
    fallbackSelector: '[data-tutorial="services-list"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/services') ctx.navigateTo('/services');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l6-s2-add',
    lessonId: 6,
    stepIndex: 1,
    route: '/services',
    targetSelector: '[data-tutorial="add-service-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/services') ctx.navigateTo('/services');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l6-s3-save',
    lessonId: 6,
    stepIndex: 2,
    route: '/services',
    targetSelector: '[data-tutorial="save-service-btn"]',
    fallbackSelector: '[data-tutorial="service-name-input"]',
    allowedInteractionArea: '[data-modal="service-modal"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/services') ctx.navigateTo('/services');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l6-s4-toggle',
    lessonId: 6,
    stepIndex: 3,
    route: '/services',
    targetSelector: '[data-tutorial="toggle-service-btn"]',
    fallbackSelector: '[data-tutorial="service-item"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/services') ctx.navigateTo('/services');
      if (ctx.modals.isServiceModalOpen) ctx.modals.setServiceModalOpen(false);
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 7: Import ---
  {
    id: 'l7-s1-stepper',
    lessonId: 7,
    stepIndex: 0,
    route: '/import',
    targetSelector: '[data-tutorial="import-stepper"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/import') ctx.navigateTo('/import');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l7-s2-sample',
    lessonId: 7,
    stepIndex: 1,
    route: '/import',
    targetSelector: '[data-tutorial="download-sample-btn"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/import') ctx.navigateTo('/import');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l7-s3-skip',
    lessonId: 7,
    stepIndex: 2,
    route: '/import',
    targetSelector: '[data-tutorial="import-dropzone"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/import') ctx.navigateTo('/import');
      return true;
    },
    canAdvanceManually: true,
  },

  // --- LESSON 8: Results & Settings & Finish ---
  {
    id: 'l8-s1-results',
    lessonId: 8,
    stepIndex: 0,
    route: '/results',
    targetSelector: '[data-tutorial="results-funnel"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/results') ctx.navigateTo('/results');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l8-s2-settings-profile',
    lessonId: 8,
    stepIndex: 1,
    route: '/settings',
    targetSelector: '[data-tutorial="settings-profile-tab"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/settings') ctx.navigateTo('/settings');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l8-s3-settings-billing',
    lessonId: 8,
    stepIndex: 2,
    route: '/settings',
    targetSelector: '[data-tutorial="settings-billing-tab"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/settings') ctx.navigateTo('/settings');
      return true;
    },
    canAdvanceManually: true,
  },
  {
    id: 'l8-s4-finish',
    lessonId: 8,
    stepIndex: 3,
    route: '/results',
    targetSelector: '[data-tutorial="tutorial-finish-card"]',
    fallbackSelector: '[data-tutorial="results-funnel"]',
    ensure: (ctx) => {
      if (ctx.pathname !== '/results') ctx.navigateTo('/results');
      return true;
    },
    canAdvanceManually: true,
  },
];

export function getStepDef(lessonId: number, stepIndex: number): TutorialStepDef | undefined {
  return TUTORIAL_STEP_DEFS.find((d) => d.lessonId === lessonId && d.stepIndex === stepIndex);
}
