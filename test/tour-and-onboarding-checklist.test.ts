import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOUR_STEPS,
  isTourCompleted,
  setTourCompleted,
  isTourSkipped,
  setTourSkipped,
  resetTour,
  isChecklistDismissed,
  setChecklistDismissed,
  calculateChecklistProgress,
} from '../lib/tour-config';
import {
  SAMPLE_TAG,
  generateSampleClients,
  isSampleCustomer,
  getSampleCustomerCount,
} from '../lib/sample-data';

test('Guided Tour & Onboarding Checklist Test Suite', async (t) => {
  await t.test('--- Suite 1: Tour Configuration & Step Integrity ---', () => {
    assert.strictEqual(TOUR_STEPS.length, 5, 'Tour must contain exactly 5 canonical steps');

    const expectedIds = [
      'tour-step-add-customer',
      'tour-step-queue',
      'tour-step-whatsapp',
      'tour-step-complete',
      'tour-step-results',
    ];

    TOUR_STEPS.forEach((step, idx) => {
      assert.strictEqual(step.id, expectedIds[idx], `Step ${idx} must have id ${expectedIds[idx]}`);
      assert.strictEqual(step.stepNumber, idx + 1, `Step ${idx} stepNumber must match index + 1`);
      assert.ok(step.title && step.title.length > 0, `Step ${step.id} must have a non-empty title`);
      assert.ok(step.description && step.description.length > 0, `Step ${step.id} must have a descriptive text`);
      assert.ok(step.route && step.route.startsWith('/'), `Step ${step.id} route must be valid`);
      assert.ok(step.targetSelector && step.targetSelector.startsWith('['), `Step ${step.id} must have a valid data-tour selector`);
    });

    console.log('  ✔ All 5 canonical tour steps verified with valid targets and routes');
  });

  await t.test('--- Suite 2: Tour State Persistence (Complete, Skip, Reset) ---', () => {
    const testBizId = 'test_biz_1001';
    const otherBizId = 'test_biz_2002';

    // Initial state: not completed or skipped
    resetTour(testBizId);
    resetTour(otherBizId);
    assert.strictEqual(isTourCompleted(testBizId), false, 'Initially tour is not completed');
    assert.strictEqual(isTourSkipped(testBizId), false, 'Initially tour is not skipped');

    // Complete tour for testBizId
    setTourCompleted(testBizId);
    assert.strictEqual(isTourCompleted(testBizId), true, 'Tour marked completed');
    assert.strictEqual(isTourSkipped(testBizId), false, 'Skipped flag cleared when completed');
    assert.strictEqual(isTourCompleted(otherBizId), false, 'Other business tour remains uncompleted (tenant isolation)');

    // Skip tour for otherBizId
    setTourSkipped(otherBizId);
    assert.strictEqual(isTourSkipped(otherBizId), true, 'Other business marked skipped');
    assert.strictEqual(isTourCompleted(otherBizId), false, 'Other business is not marked completed');

    // Reset tour
    resetTour(testBizId);
    assert.strictEqual(isTourCompleted(testBizId), false, 'Tour completion reset successfully for replay');

    console.log('  ✔ Tour state transitions (start, complete, skip, replay reset) verified with tenant isolation');
  });

  await t.test('--- Suite 3: Checklist Progress Calculation Engine ---', () => {
    // Case 1: Fresh brand-new shop (0 customers)
    const zeroState = calculateChecklistProgress([], [], []);
    assert.strictEqual(zeroState.hasCustomers, false);
    assert.strictEqual(zeroState.hasSentReminder, false);
    assert.strictEqual(zeroState.hasCompletedService, false);
    assert.strictEqual(zeroState.completedCount, 0);
    assert.strictEqual(zeroState.allCompleted, false);
    assert.strictEqual(zeroState.percentage, 0);

    // Case 2: Only archived customers exist
    const archivedOnly = calculateChecklistProgress(
      [{ id: 'c1', isArchived: true }],
      [],
      []
    );
    assert.strictEqual(archivedOnly.hasCustomers, false, 'Archived customers do not satisfy active customer step');
    assert.strictEqual(archivedOnly.completedCount, 0);

    // Case 3: Added first active customer, no reminders sent yet
    const step1Done = calculateChecklistProgress(
      [{ id: 'c1', isArchived: false }],
      [{ followUpStatus: 'NOT_CONTACTED' }],
      []
    );
    assert.strictEqual(step1Done.hasCustomers, true);
    assert.strictEqual(step1Done.hasSentReminder, false);
    assert.strictEqual(step1Done.hasCompletedService, false);
    assert.strictEqual(step1Done.completedCount, 1);
    assert.strictEqual(step1Done.allCompleted, false);
    assert.strictEqual(step1Done.percentage, 33);

    // Case 4: Reminder contacted or customer replied
    const step2Done = calculateChecklistProgress(
      [{ id: 'c1', isArchived: false }],
      [{ followUpStatus: 'CONTACTED' }],
      []
    );
    assert.strictEqual(step2Done.hasCustomers, true);
    assert.strictEqual(step2Done.hasSentReminder, true);
    assert.strictEqual(step2Done.hasCompletedService, false);
    assert.strictEqual(step2Done.completedCount, 2);
    assert.strictEqual(step2Done.percentage, 67);

    // Case 5: Service completed (current service followUpStatus === 'COMPLETED')
    const allDoneLive = calculateChecklistProgress(
      [{ id: 'c1', isArchived: false }],
      [{ followUpStatus: 'COMPLETED' }],
      []
    );
    assert.strictEqual(allDoneLive.hasCustomers, true);
    assert.strictEqual(allDoneLive.hasSentReminder, true);
    assert.strictEqual(allDoneLive.hasCompletedService, true);
    assert.strictEqual(allDoneLive.completedCount, 3);
    assert.strictEqual(allDoneLive.allCompleted, true);
    assert.strictEqual(allDoneLive.percentage, 100);

    // Case 6: Service completed via history record
    const allDoneHistory = calculateChecklistProgress(
      [{ id: 'c1', isArchived: false }],
      [{ followUpStatus: 'NOT_CONTACTED' }],
      [{ id: 'h1', completedAt: '2026-10-10' }]
    );
    assert.strictEqual(allDoneHistory.hasCompletedService, true, 'Historical completed records fulfill completion');

    console.log('  ✔ Checklist calculations accurately reflect live customer, reminder, and completion data');
  });

  await t.test('--- Suite 4: Checklist Dismissal Persistence ---', () => {
    const bizId = 'biz_dismiss_test';
    setChecklistDismissed(bizId, false);
    assert.strictEqual(isChecklistDismissed(bizId), false, 'Initially not dismissed');

    setChecklistDismissed(bizId, true);
    assert.strictEqual(isChecklistDismissed(bizId), true, 'Checklist dismissed state persisted');

    setChecklistDismissed(bizId, false);
    assert.strictEqual(isChecklistDismissed(bizId), false, 'Checklist un-dismissed');

    console.log('  ✔ Checklist dismissal persistence and toggle verified');
  });

  await t.test('--- Suite 5: Sample Data Generation & One-Tap Removal Tags ---', () => {
    // Generate sample clients for AC
    const acClients = generateSampleClients('Air Conditioning Maintenance');
    assert.strictEqual(acClients.length, 3, 'Generates 3 sample clients');
    acClients.forEach((client) => {
      assert.ok(isSampleCustomer(client), `Client ${client.name} must be identified as sample data`);
      assert.ok(client.name.includes(SAMPLE_TAG), 'Name contains [Sample Data]');
      assert.ok(client.address.includes(SAMPLE_TAG), 'Address contains [Sample Data]');
    });

    // Real client should NOT be marked as sample
    const realClient = {
      name: 'Mohanlal V.',
      address: 'Panampilly Nagar, Kochi',
      notes: 'Customer since 2024',
    };
    assert.strictEqual(isSampleCustomer(realClient), false, 'Real client is not marked as sample');

    // Count calculation
    const mixed = [...acClients, realClient];
    assert.strictEqual(getSampleCustomerCount(mixed), 3, 'Accurately counts 3 sample clients in mixed list');

    // Generate for RO Water Purifier
    const roClients = generateSampleClients('Water Purifier / RO Service');
    assert.strictEqual(roClients.length, 3);
    assert.ok(roClients[0].assetName.toLowerCase().includes('purifier'));

    console.log('  ✔ Sample data generation, tagging, and identification verified across business categories');
  });
});
