import { ServiceUrgency, IntervalUnit } from './types';

export interface DueCalculationResult {
  urgency: ServiceUrgency;
  daysDiff: number; // negative = overdue, 0 = today, positive = future
  formattedDue: string;
  badgeLabel: string;
}

/**
 * Calculates due status relative to today (or custom reference date).
 */
export function calculateDueStatus(dueDateStr: string, referenceDate: Date = new Date()): DueCalculationResult {
  const [year, month, day] = dueDateStr.split('-').map(Number);
  
  // Normalize both dates to UTC midnight for exact timezone-agnostic day differences
  const targetUtc = Date.UTC(year, month - 1, day);
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((targetUtc - refUtc) / msPerDay);

  let urgency: ServiceUrgency = 'FUTURE';
  let badgeLabel = '';

  if (daysDiff < 0) {
    urgency = 'OVERDUE';
    const absDays = Math.abs(daysDiff);
    badgeLabel = absDays === 1 ? '1 day overdue' : `${absDays} days overdue`;
  } else if (daysDiff === 0) {
    urgency = 'DUE_TODAY';
    badgeLabel = 'Due Today';
  } else if (daysDiff <= 7) {
    urgency = 'DUE_THIS_WEEK';
    badgeLabel = daysDiff === 1 ? 'Due tomorrow' : `Due in ${daysDiff} days`;
  } else if (daysDiff <= 30) {
    urgency = 'DUE_THIS_MONTH';
    badgeLabel = `Due in ${daysDiff} days`;
  } else {
    urgency = 'FUTURE';
    badgeLabel = `Due in ${Math.round(daysDiff / 30)} months`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDue = `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;

  return {
    urgency,
    daysDiff,
    formattedDue,
    badgeLabel,
  };
}

/**
 * Adds interval (days, months, or years) to a given date string (YYYY-MM-DD).
 * Safely handles month-end dates (e.g. Jan 31 + 1 month => Feb 28/29) and leap years.
 */
export function calculateNextDueDate(
  completedDateStr: string,
  intervalValue: number,
  intervalUnit: IntervalUnit = 'MONTHS'
): string {
  if (!completedDateStr || intervalValue < 0) return completedDateStr;
  const [year, month, day] = completedDateStr.split('-').map(Number);

  if (intervalUnit === 'DAYS') {
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    utcDate.setUTCDate(utcDate.getUTCDate() + intervalValue);
    const nextY = utcDate.getUTCFullYear();
    const nextM = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const nextD = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  }

  if (intervalUnit === 'YEARS') {
    const targetYear = year + intervalValue;
    const targetMonth = month;
    // Handle leap year clamp (e.g. 2024-02-29 + 1 year => 2025-02-28)
    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const targetDay = Math.min(day, daysInTargetMonth);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  }

  // Default: MONTHS
  const totalMonths = (month - 1) + intervalValue;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1; // 1-12
  // Handle month-end clamp (e.g. 2026-01-31 + 1 month => 2026-02-28)
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/**
 * Formats interval number and unit into human readable string e.g. "6 months", "1 year", "45 days".
 */
export function formatIntervalDisplay(value: number, unit: IntervalUnit = 'MONTHS'): string {
  const lower = unit.toLowerCase();
  if (value === 1) {
    if (unit === 'DAYS') return '1 day';
    if (unit === 'MONTHS') return '1 month';
    if (unit === 'YEARS') return '1 year';
  }
  return `${value} ${lower}`;
}

/**
 * Formats standard date to human readable e.g. "12 Oct 2026"
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
}
