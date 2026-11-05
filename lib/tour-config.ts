export interface TourStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  route: string;
  targetSelector: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  badgeText?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'tour-step-add-customer',
    stepNumber: 1,
    title: 'Add or Import Customers',
    description:
      'Start by adding a single customer or importing your existing customer list from Excel/CSV. Each customer gets an appliance and maintenance cadence.',
    route: '/dashboard',
    targetSelector: '[data-tour="tour-add-customer"]',
    placement: 'bottom',
    badgeText: 'Step 1 of 5',
  },
  {
    id: 'tour-step-queue',
    stepNumber: 2,
    title: "Your Today's Follow-up Queue",
    description:
      'RenewalDesk organizes customers into Overdue, Today, and This Week tabs. Your team always knows exactly who needs service without checking paper notebooks.',
    route: '/dashboard',
    targetSelector: '[data-tour="tour-today-queue"]',
    placement: 'bottom',
    badgeText: 'Step 2 of 5',
  },
  {
    id: 'tour-step-whatsapp',
    stepNumber: 3,
    title: '1-Click WhatsApp Reminders',
    description:
      'Tap "WhatsApp" to open a pre-filled, personalized reminder in wa.me click-to-chat. No API keys or extra software required.',
    route: '/dashboard',
    targetSelector: '[data-tour="tour-whatsapp-action"]',
    placement: 'top',
    badgeText: 'Step 3 of 5',
  },
  {
    id: 'tour-step-complete',
    stepNumber: 4,
    title: 'Mark Booked & Completed (Auto Next Due Date)',
    description:
      'When service is done, mark it Completed. RenewalDesk logs the collected fee and automatically schedules the next due date based on the service interval.',
    route: '/dashboard',
    targetSelector: '[data-tour="tour-complete-action"]',
    placement: 'top',
    badgeText: 'Step 4 of 5',
  },
  {
    id: 'tour-step-results',
    stepNumber: 5,
    title: 'Track Recovered Revenue',
    description:
      'See your repeat service conversion funnel, total retained revenue, and lost customer recovery metrics on the Results page.',
    route: '/results',
    targetSelector: '[data-tour="tour-results-link"]',
    placement: 'right',
    badgeText: 'Step 5 of 5',
  },
];

// Memory fallback store for SSR or environments where localStorage throws (private mode, security rules)
const memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore localStorage errors
  }
  return memoryStorage[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore localStorage errors
  }
  memoryStorage[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage errors
  }
  delete memoryStorage[key];
}

/** Resolves storage key prefixed by tenant / user ID to preserve isolation */
function resolveTourKey(prefix: string, id?: string): string {
  const sanitizedId = (id || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${prefix}_${sanitizedId}`;
}

export function isTourCompleted(id?: string): boolean {
  const val = safeGetItem(resolveTourKey('rd_tour_completed', id));
  return val === 'true';
}

export function setTourCompleted(id?: string): void {
  safeSetItem(resolveTourKey('rd_tour_completed', id), 'true');
  safeRemoveItem(resolveTourKey('rd_tour_skipped', id));
}

export function isTourSkipped(id?: string): boolean {
  const val = safeGetItem(resolveTourKey('rd_tour_skipped', id));
  return val === 'true';
}

export function setTourSkipped(id?: string): void {
  safeSetItem(resolveTourKey('rd_tour_skipped', id), 'true');
}

export function resetTour(id?: string): void {
  safeRemoveItem(resolveTourKey('rd_tour_completed', id));
  safeRemoveItem(resolveTourKey('rd_tour_skipped', id));
}

export function isChecklistDismissed(id?: string): boolean {
  const val = safeGetItem(resolveTourKey('rd_checklist_dismissed', id));
  return val === 'true';
}

export function setChecklistDismissed(id?: string, dismissed = true): void {
  if (dismissed) {
    safeSetItem(resolveTourKey('rd_checklist_dismissed', id), 'true');
  } else {
    safeRemoveItem(resolveTourKey('rd_checklist_dismissed', id));
  }
}

export interface ChecklistProgress {
  hasCustomers: boolean;
  hasSentReminder: boolean;
  hasCompletedService: boolean;
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  percentage: number;
}

/**
 * Calculates getting-started checklist progress deterministically from live shop data:
 * 1. Add first customer (customers.length > 0)
 * 2. Send first reminder (any service with followUpStatus !== 'NOT_CONTACTED')
 * 3. Mark first service completed (any service with followUpStatus === 'COMPLETED' or historical records)
 */
export function calculateChecklistProgress(
  customers: Array<{ id?: string; isArchived?: boolean }> = [],
  services: Array<{ followUpStatus?: string }> = [],
  serviceHistory: Array<unknown> = []
): ChecklistProgress {
  const hasCustomers = customers.filter(c => !c.isArchived).length > 0;
  
  const hasSentReminder = services.some(
    s => s.followUpStatus && s.followUpStatus !== 'NOT_CONTACTED'
  );

  const hasCompletedService =
    serviceHistory.length > 0 ||
    services.some(s => s.followUpStatus === 'COMPLETED');

  let completedCount = 0;
  if (hasCustomers) completedCount++;
  if (hasSentReminder) completedCount++;
  if (hasCompletedService) completedCount++;

  const totalCount = 3;
  const allCompleted = completedCount === totalCount;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    hasCustomers,
    hasSentReminder,
    hasCompletedService,
    completedCount,
    totalCount,
    allCompleted,
    percentage,
  };
}
