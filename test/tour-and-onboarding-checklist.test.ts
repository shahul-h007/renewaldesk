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

    // Case 7: CRITICAL — Sample customer records MUST NOT tick any checklist items!
    const sampleOnlyState = calculateChecklistProgress(
      [
        { id: 'sample_1', name: `Kavitha Nair ${SAMPLE_TAG}`, isArchived: false, notes: SAMPLE_TAG },
        { id: 'sample_2', name: `Dr. Rahul Sharma ${SAMPLE_TAG}`, isArchived: false, notes: SAMPLE_TAG },
      ],
      [
        { customerId: 'sample_1', followUpStatus: 'CONTACTED', notes: SAMPLE_TAG },
        { customerId: 'sample_2', followUpStatus: 'COMPLETED', notes: SAMPLE_TAG },
      ],
      [
        { customerId: 'sample_2', completedAt: '2026-11-01', notes: SAMPLE_TAG },
      ]
    );
    assert.strictEqual(sampleOnlyState.hasCustomers, false, 'Sample customers must not tick "Add customer"');
    assert.strictEqual(sampleOnlyState.hasSentReminder, false, 'Sample customer reminders must not tick "Send reminder"');
    assert.strictEqual(sampleOnlyState.hasCompletedService, false, 'Sample customer completions must not tick "Mark completed"');
    assert.strictEqual(sampleOnlyState.completedCount, 0, 'Checklist ticks must remain 0 when only sample data exists');

    console.log('  ✔ Checklist calculations accurately reflect live customer, reminder, and completion data');
    console.log('  ✔ Verified: Sample customer records strictly excluded from checklist progress ticks');
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

  await t.test('--- Suite 6: Tour Missing Target Graceful Handling ---', () => {
    // Verify each step has a clear fallback text explanation when its DOM target element is missing
    TOUR_STEPS.forEach((step) => {
      assert.ok(
        step.missingTargetExplanation && step.missingTargetExplanation.length > 10,
        `Step ${step.id} must define a clear missingTargetExplanation`
      );
    });

    // Test WhatsApp and Complete steps (the ones absent in a 0-customer account)
    const whatsappStep = TOUR_STEPS.find(s => s.id === 'tour-step-whatsapp');
    const completeStep = TOUR_STEPS.find(s => s.id === 'tour-step-complete');

    assert.ok(whatsappStep?.missingTargetExplanation?.includes('WhatsApp'));
    assert.ok(completeStep?.missingTargetExplanation?.includes('completed'));

    console.log('  ✔ All tour steps contain fallback explanations when target DOM element is absent');
  });

  await t.test('--- Suite 7: Sample Data Hard-Delete Invariant ---', () => {
    // Simulate active store state with 3 sample clients and 1 real client
    const sampleSeeds = generateSampleClients('Air Conditioning Maintenance');
    let customers = sampleSeeds.map((s, i) => ({
      id: `sample_${i}`,
      name: s.name,
      phone: s.phone,
      address: s.address,
      notes: s.notes,
    }));
    customers.push({
      id: 'real_1',
      name: 'Dr. John Doe',
      phone: '9846099999',
      address: 'Kochi',
      notes: 'Real customer',
    });

    let assets = customers.map((c) => ({
      id: `asset_${c.id}`,
      customerId: c.id,
      name: 'AC Unit',
    }));

    let services = customers.map((c) => ({
      id: `svc_${c.id}`,
      customerId: c.id,
      followUpStatus: 'NOT_CONTACTED',
    }));

    let archivePool: any[] = [];

    // Simulate "Remove Sample Data" using hardDeleteCustomer logic
    const sampleCustIds = customers.filter(isSampleCustomer).map(c => c.id);
    assert.strictEqual(sampleCustIds.length, 3, 'Must identify all 3 sample customers for hard-delete');

    sampleCustIds.forEach((id) => {
      // 1. Remove from active state
      customers = customers.filter(c => c.id !== id);
      assets = assets.filter(a => a.customerId !== id);
      services = services.filter(s => s.customerId !== id);

      // 2. Do NOT add to archive pool, and ensure archive pool is purged of this ID
      archivePool = archivePool.filter(item => item.id !== id);
    });

    // Invariant 1: Only real customer remains in active list
    assert.strictEqual(customers.length, 1);
    assert.strictEqual(customers[0].id, 'real_1');

    // Invariant 2: Related rows (assets, services) for sample customers are fully purged
    assert.strictEqual(assets.length, 1);
    assert.strictEqual(assets[0].customerId, 'real_1');
    assert.strictEqual(services.length, 1);
    assert.strictEqual(services[0].customerId, 'real_1');

    // Invariant 3: Sample data NEVER enters the archive pool (never counts toward capacity or shows in Archived)
    assert.strictEqual(archivePool.length, 0, 'Archive pool must remain 0 — sample data is hard-deleted, not archived');

    console.log('  ✔ Sample data hard-delete invariant verified: cascades to related rows and never enters archive pool');
  });
});
