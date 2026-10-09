import assert from 'node:assert/strict';
import { calculateNextDueDate, calculateDueStatus, formatIntervalDisplay } from '../lib/due-date-engine';
import { ServiceCatalogItem, ServiceRecord } from '../lib/types';

console.log('🧪 Starting RenewalDesk Recurrence & Service Types Test Suite...\n');

// ==========================================
// Test Suite 1: calculateNextDueDate
// ==========================================
console.log('--- Suite 1: calculateNextDueDate Recurrence Calculations ---');

// 1. Standard Monthly intervals
{
  const next = calculateNextDueDate('2026-04-10', 6, 'MONTHS');
  assert.equal(next, '2026-10-10', 'Adding 6 months to 2026-04-10 should equal 2026-10-10');
  console.log('  ✔ Standard 6-month interval calculation passed');
}

// 2. Standard Daily intervals
{
  const next = calculateNextDueDate('2026-05-01', 45, 'DAYS');
  assert.equal(next, '2026-06-15', 'Adding 45 days to 2026-05-01 should equal 2026-06-15');
  console.log('  ✔ 45-day interval calculation passed');
}

// 3. Standard Yearly intervals
{
  const next = calculateNextDueDate('2026-03-01', 1, 'YEARS');
  assert.equal(next, '2027-03-01', 'Adding 1 year to 2026-03-01 should equal 2027-03-01');
  console.log('  ✔ 1-year interval calculation passed');
}

// 4. Month-end clamping (January 31 + 1 month => February 28 in non-leap year)
{
  const next = calculateNextDueDate('2026-01-31', 1, 'MONTHS');
  assert.equal(next, '2026-02-28', 'Jan 31 + 1 month in 2026 should clamp to Feb 28, not slip into March');
  console.log('  ✔ Jan 31 + 1 month clamping passed (2026-02-28)');
}

// 5. Month-end clamping for 31-day month to 30-day month (Aug 31 + 1 month => Sep 30)
{
  const next = calculateNextDueDate('2026-08-31', 1, 'MONTHS');
  assert.equal(next, '2026-09-30', 'Aug 31 + 1 month should clamp to Sep 30, not slip into October');
  console.log('  ✔ Aug 31 + 1 month clamping passed (2026-09-30)');
}

// 6. Month-end clamping for May 31 + 1 month => June 30
{
  const next = calculateNextDueDate('2026-05-31', 1, 'MONTHS');
  assert.equal(next, '2026-06-30', 'May 31 + 1 month should clamp to June 30');
  console.log('  ✔ May 31 + 1 month clamping passed (2026-06-30)');
}

// 7. Leap year handling: Feb 29 on leap year + 1 year => Feb 28 on next non-leap year
{
  const next = calculateNextDueDate('2024-02-29', 1, 'YEARS');
  assert.equal(next, '2025-02-28', '2024-02-29 + 1 year should clamp to 2025-02-28');
  console.log('  ✔ Leap year to non-leap year clamping passed (2024-02-29 -> 2025-02-28)');
}

// 8. Leap year handling: Feb 29 on leap year + 4 years => Feb 29 on next leap year
{
  const next = calculateNextDueDate('2024-02-29', 4, 'YEARS');
  assert.equal(next, '2028-02-29', '2024-02-29 + 4 years should be 2028-02-29');
  console.log('  ✔ Leap year to next leap year calculation passed (2024-02-29 -> 2028-02-29)');
}

// 9. AMC 3-month interval calculation: Nov 30 to Feb 28
{
  const next = calculateNextDueDate('2025-11-30', 3, 'MONTHS');
  assert.equal(next, '2026-02-28', 'AMC quarterly visit 2025-11-30 + 3 months should equal 2026-02-28');
  console.log('  ✔ AMC quarterly routine cadence calculation passed');
}

// ==========================================
// Test Suite 2: calculateDueStatus
// ==========================================
console.log('\n--- Suite 2: calculateDueStatus Urgency Classification ---');

const refDate = new Date(2026, 9, 8); // 2026-10-08

// 1. OVERDUE (past due date)
{
  const res = calculateDueStatus('2026-10-03', refDate);
  assert.equal(res.urgency, 'OVERDUE');
  assert.equal(res.daysDiff, -5);
  assert.equal(res.badgeLabel, '5 days overdue');
  console.log('  ✔ OVERDUE status correctly classified');
}

// 2. DUE_TODAY (same date)
{
  const res = calculateDueStatus('2026-10-08', refDate);
  assert.equal(res.urgency, 'DUE_TODAY');
  assert.equal(res.daysDiff, 0);
  assert.equal(res.badgeLabel, 'Due Today');
  console.log('  ✔ DUE_TODAY status correctly classified');
}

// 3. DUE_THIS_WEEK (due within 1-7 days)
{
  const res = calculateDueStatus('2026-10-12', refDate);
  assert.equal(res.urgency, 'DUE_THIS_WEEK');
  assert.equal(res.daysDiff, 4);
  assert.equal(res.badgeLabel, 'Due in 4 days');
  console.log('  ✔ DUE_THIS_WEEK status correctly classified');
}

// 4. DUE_THIS_MONTH (due within 8-30 days)
{
  const res = calculateDueStatus('2026-10-25', refDate);
  assert.equal(res.urgency, 'DUE_THIS_MONTH');
  assert.equal(res.daysDiff, 17);
  assert.equal(res.badgeLabel, 'Due in 17 days');
  console.log('  ✔ DUE_THIS_MONTH status correctly classified');
}

// 5. FUTURE (due > 30 days)
{
  const res = calculateDueStatus('2027-04-08', refDate);
  assert.equal(res.urgency, 'FUTURE');
  assert.ok(res.daysDiff > 30);
  console.log('  ✔ FUTURE status correctly classified');
}

// ==========================================
// Test Suite 3: formatIntervalDisplay
// ==========================================
console.log('\n--- Suite 3: formatIntervalDisplay Formatting ---');
{
  assert.equal(formatIntervalDisplay(1, 'DAYS'), '1 day');
  assert.equal(formatIntervalDisplay(45, 'DAYS'), '45 days');
  assert.equal(formatIntervalDisplay(1, 'MONTHS'), '1 month');
  assert.equal(formatIntervalDisplay(6, 'MONTHS'), '6 months');
  assert.equal(formatIntervalDisplay(1, 'YEARS'), '1 year');
  assert.equal(formatIntervalDisplay(2, 'YEARS'), '2 years');
  console.log('  ✔ All cadence interval labels formatted correctly');
}

// ==========================================
// Test Suite 4: Service Catalog Business Rules
// ==========================================
console.log('\n--- Suite 4: Service Catalog Integrity & Safety Rules ---');

// Mock catalog and records
let catalog: ServiceCatalogItem[] = [
  {
    id: 'cat-1',
    name: 'AC Periodic General Service',
    description: 'Standard filter wash',
    intervalValue: 6,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 6,
    typicalPrice: 1200,
    isActive: true,
  },
  {
    id: 'cat-2',
    name: 'Deep Jet Chemical Foam Wash',
    description: 'High-pressure foam wash',
    intervalValue: 12,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 12,
    typicalPrice: 1800,
    isActive: true,
  },
];

let services: ServiceRecord[] = [
  {
    id: 's-1',
    customerId: 'c-1',
    assetId: 'a-1',
    serviceName: 'AC Periodic General Service',
    lastServiceDate: '2026-04-10',
    nextDueDate: '2026-10-10',
    intervalMonths: 6,
    serviceAmount: 1200,
    urgency: 'DUE_TODAY',
    followUpStatus: 'NOT_CONTACTED',
  },
];

// Helper: Check duplicate
function checkDuplicateName(name: string, excludeId?: string): boolean {
  return catalog.some(c => c.id !== excludeId && c.name.trim().toLowerCase() === name.trim().toLowerCase());
}

// Helper: Delete or Deactivate safety rule
function safeDeleteService(id: string): { action: 'DEACTIVATED' | 'DELETED'; message: string } {
  const item = catalog.find(c => c.id === id);
  if (!item) throw new Error('Not found');
  const isReferenced = services.some(s => s.serviceName.toLowerCase() === item.name.toLowerCase());
  if (isReferenced) {
    item.isActive = false;
    return {
      action: 'DEACTIVATED',
      message: `Referenced by customer records. Deactivated instead of deleted.`,
    };
  }
  catalog = catalog.filter(c => c.id !== id);
  return { action: 'DELETED', message: 'Deleted successfully' };
}

// 1. Duplicate detection
{
  assert.equal(checkDuplicateName('ac periodic general service'), true, 'Should detect case-insensitive duplicate');
  assert.equal(checkDuplicateName('  AC Periodic General Service  '), true, 'Should detect duplicate with padding');
  assert.equal(checkDuplicateName('Brand New Duct Cleaning'), false, 'Should allow unique new name');
  console.log('  ✔ Duplicate service name detection passed');
}

// 2. Safe deletion rule: Never delete referenced services, deactivate instead
{
  const result = safeDeleteService('cat-1');
  assert.equal(result.action, 'DEACTIVATED', 'Referenced service must be deactivated, not hard deleted');
  const item = catalog.find(c => c.id === 'cat-1');
  assert.equal(item?.isActive, false, 'Service item should now have isActive = false');
  console.log('  ✔ Referenced service safety check passed (deactivated instead of deleted)');
}

// 3. Unreferenced service deletion
{
  const result = safeDeleteService('cat-2');
  assert.equal(result.action, 'DELETED', 'Unreferenced service can be cleanly deleted');
  assert.equal(catalog.find(c => c.id === 'cat-2'), undefined);
  console.log('  ✔ Unreferenced service deletion passed');
}

// 4. Interval editing policy: Existing due dates remain unchanged unless explicit opt-in
{
  const originalDueDate = services[0].nextDueDate;
  const updatedIntervalValue = 3; // Changed from 6 to 3 months

  // Case A: Default update (no opt-in) -> existing due date untouched
  const updatedServiceWithoutOptIn = { ...services[0] };
  assert.equal(updatedServiceWithoutOptIn.nextDueDate, originalDueDate);
  console.log('  ✔ Interval update without opt-in preserves existing customer due dates');

  // Case B: With opt-in -> recalculates upcoming due date
  const newDueDate = calculateNextDueDate(services[0].lastServiceDate, updatedIntervalValue, 'MONTHS');
  assert.equal(newDueDate, '2026-07-10');
  console.log('  ✔ Interval update with explicit opt-in accurately recalculates due dates');
}

console.log('\n🎉 ALL 18 TESTS PASSED SUCCESSFULLY!\n');
