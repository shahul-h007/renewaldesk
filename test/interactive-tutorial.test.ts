import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_LESSONS,
  getLessonById,
  getStepContent,
} from '../lib/tutorial-content';
import {
  INITIAL_TUTORIAL_STATE,
  resolveTutorialKey,
  getTutorialState,
  saveTutorialState,
  startTutorial,
  skipTutorial,
  resumeTutorial,
  resetTutorial,
  advanceTutorialStep,
  previousTutorialStep,
  setPracticeCustomerInState,
  completeTutorial,
  isValidCustomerName,
  isValidIndianPhone,
  hasPlaceholderTag,
} from '../lib/tutorial-engine';

test('RenewalDesk Interactive Tutorial Engine Test Suite', async (t) => {
  await t.test('--- Suite 1: Tutorial Content & Lesson Structure Integrity ---', () => {
    assert.strictEqual(TUTORIAL_LESSONS.length, 6, 'Tutorial must contain exactly 6 canonical lessons');

    const expectedTitles = [
      'Add your first customer',
      'Find your customer in Today',
      'Send a WhatsApp reminder',
      'Track the answer (statuses)',
      'Create your own message template',
      'See your results, finish',
    ];

    const expectedRoutes = [
      '/dashboard',
      '/dashboard',
      '/dashboard',
      '/dashboard',
      '/templates',
      '/results',
    ];

    TUTORIAL_LESSONS.forEach((lesson, idx) => {
      assert.strictEqual(lesson.id, idx + 1, `Lesson at index ${idx} must have id ${idx + 1}`);
      assert.strictEqual(lesson.title, expectedTitles[idx], `Lesson ${lesson.id} title mismatch`);
      assert.strictEqual(lesson.route, expectedRoutes[idx], `Lesson ${lesson.id} route mismatch`);
      assert.ok(lesson.shortDescription && lesson.shortDescription.length > 5, `Lesson ${lesson.id} must have shortDescription`);
      assert.ok(Array.isArray(lesson.steps) && lesson.steps.length > 0, `Lesson ${lesson.id} must have steps`);

      lesson.steps.forEach((step, sIdx) => {
        assert.strictEqual(step.lessonNumber, lesson.id, `Step ${step.id} lessonNumber mismatch`);
        assert.strictEqual(step.stepNumber, sIdx + 1, `Step ${step.id} stepNumber mismatch`);
        assert.strictEqual(step.totalStepsInLesson, lesson.steps.length, `Step ${step.id} totalSteps mismatch`);
        assert.ok(step.stepTitle && step.stepTitle.length > 0, `Step ${step.id} must have stepTitle`);
        assert.ok(step.instruction && step.instruction.length > 0, `Step ${step.id} must have instruction`);
        assert.ok(step.explanation && step.explanation.length > 0, `Step ${step.id} must have explanation`);
        assert.ok(step.targetSelector && step.targetSelector.length > 0, `Step ${step.id} must have targetSelector`);
        assert.ok(step.missingExplanation && step.missingExplanation.length > 0, `Step ${step.id} must have fallback explanation`);
      });
    });

    // Lookup helper checks
    assert.ok(getLessonById(1), 'getLessonById(1) should return lesson 1');
    assert.strictEqual(getLessonById(999), undefined, 'Invalid lesson id should return undefined');
    assert.ok(getStepContent(1, 0), 'getStepContent(1, 0) should return step 0 of lesson 1');
    assert.strictEqual(getStepContent(1, 999), undefined, 'Out-of-range step should return undefined');

    console.log('  ✔ All 6 interactive lessons and their steps validated with valid selectors and copy');
  });

  await t.test('--- Suite 2: Multi-Tenant State Isolation & Lifecycle Management ---', () => {
    const bizA = 'tenant_shop_a';
    const bizB = 'tenant_shop_b';

    const keyA = resolveTutorialKey(bizA);
    const keyB = resolveTutorialKey(bizB);
    assert.notStrictEqual(keyA, keyB, 'Keys for different businesses must be distinct');

    // Reset both to initial
    saveTutorialState(bizA, { ...INITIAL_TUTORIAL_STATE });
    saveTutorialState(bizB, { ...INITIAL_TUTORIAL_STATE });

    const initA = getTutorialState(bizA);
    assert.strictEqual(initA.isActive, false, 'Initial state: not active');
    assert.strictEqual(initA.hasStarted, false, 'Initial state: not started');
    assert.strictEqual(initA.isCompleted, false, 'Initial state: not completed');
    assert.strictEqual(initA.currentLesson, 1, 'Initial lesson is 1');
    assert.strictEqual(initA.currentStep, 0, 'Initial step is 0');

    // Start tutorial on bizA
    const startedA = startTutorial(bizA);
    assert.strictEqual(startedA.isActive, true, 'bizA is active after start');
    assert.strictEqual(startedA.hasStarted, true, 'bizA hasStarted is true');
    assert.strictEqual(getTutorialState(bizB).hasStarted, false, 'bizB state untouched (multi-tenant isolated)');

    // Skip tutorial on bizA
    const skippedA = skipTutorial(bizA);
    assert.strictEqual(skippedA.isActive, false, 'isActive is false after skip');
    assert.strictEqual(skippedA.isSkipped, true, 'isSkipped is true');

    // Resume tutorial on bizA
    const resumedA = resumeTutorial(bizA);
    assert.strictEqual(resumedA.isActive, true, 'isActive is true after resume');
    assert.strictEqual(resumedA.isSkipped, false, 'isSkipped cleared on resume');

    // Set practice customer
    const withCustomer = setPracticeCustomerInState(bizA, 'cust_practice_123', 'svc_practice_456');
    assert.strictEqual(withCustomer.practiceCustomerId, 'cust_practice_123', 'Practice customer ID recorded');
    assert.strictEqual(withCustomer.practiceServiceId, 'svc_practice_456', 'Practice service ID recorded');

    // Advance steps
    const step1 = advanceTutorialStep(bizA);
    assert.strictEqual(step1.currentStep, 1, 'Advanced from step 0 to step 1');

    const step0Prev = previousTutorialStep(bizA);
    assert.strictEqual(step0Prev.currentStep, 0, 'Moved back to step 0');

    // Advance through all steps of Lesson 1
    const l1StepsCount = getLessonById(1)!.steps.length;
    let curr = getTutorialState(bizA);
    for (let i = 0; i < l1StepsCount; i++) {
      curr = advanceTutorialStep(bizA);
    }
    assert.strictEqual(curr.currentLesson, 2, 'Auto-transitioned to Lesson 2 upon completing Lesson 1');
    assert.strictEqual(curr.currentStep, 0, 'Reset to step 0 on new lesson');
    assert.deepStrictEqual(curr.completedLessons, [1], 'Lesson 1 added to completedLessons');

    // Redo tutorial resets back to lesson 1
    const redone = resetTutorial(bizA);
    assert.strictEqual(redone.currentLesson, 1, 'Redo reset to lesson 1');
    assert.strictEqual(redone.currentStep, 0, 'Redo reset to step 0');
    assert.strictEqual(redone.isActive, true, 'Active after redo');
    assert.strictEqual(redone.practiceCustomerId, 'cust_practice_123', 'Practice customer ID preserved for cleanup');

    // Complete tutorial
    const completed = completeTutorial(bizA);
    assert.strictEqual(completed.isCompleted, true, 'Marked completed');
    assert.strictEqual(completed.isActive, false, 'Inactive after completion');
    assert.strictEqual(completed.completedLessons.length, 6, 'All 6 lessons marked completed');

    console.log('  ✔ Tutorial state lifecycle, step advancing, lesson transition, and tenant isolation verified');
  });

  await t.test('--- Suite 3: Event-Based Validation Helpers ---', () => {
    // Customer Name
    assert.strictEqual(isValidCustomerName('Arun Kumar'), true, 'Valid 2-word name');
    assert.strictEqual(isValidCustomerName('Raj'), true, 'Valid short name');
    assert.strictEqual(isValidCustomerName('A'), false, 'Too short (1 character)');
    assert.strictEqual(isValidCustomerName('   '), false, 'Whitespace only');
    assert.strictEqual(isValidCustomerName(''), false, 'Empty string');

    // Indian Phone Number
    assert.strictEqual(isValidIndianPhone('9846012345'), true, '10-digit clean mobile');
    assert.strictEqual(isValidIndianPhone('+919846012345'), true, '10-digit mobile with +91 country code');
    assert.strictEqual(isValidIndianPhone('09846012345'), true, '10-digit mobile with leading 0');
    assert.strictEqual(isValidIndianPhone('98460 12345'), true, '10-digit mobile with whitespace');
    assert.strictEqual(isValidIndianPhone('9846-012345'), true, '10-digit mobile with hyphen');
    assert.strictEqual(isValidIndianPhone('12345'), false, 'Too short');
    assert.strictEqual(isValidIndianPhone('1234567890123'), false, 'Too long');
    assert.strictEqual(isValidIndianPhone('abcdefghij'), false, 'Alphabetic characters');

    // Mustache Placeholder Detection
    assert.strictEqual(hasPlaceholderTag('Hi {{customer_name}}, service due!'), true, 'Contains single tag');
    assert.strictEqual(hasPlaceholderTag('Your {{service_name}} for {{asset_name}}'), true, 'Contains multiple tags');
    assert.strictEqual(hasPlaceholderTag('No tags in this plain message'), false, 'No placeholder tags');
    assert.strictEqual(hasPlaceholderTag('Broken tag {customer_name}'), false, 'Single brace does not match');

    console.log('  ✔ Validation helpers for name, 10-digit phone, and template placeholders verified');
  });

  await t.test('--- Suite 4: Safety, Non-Trap Guarantees & Missing Target Fallbacks ---', () => {
    // Check that every step has clear plain text instruction and missing explanation
    TUTORIAL_LESSONS.forEach((lesson) => {
      lesson.steps.forEach((step) => {
        assert.ok(step.instruction.length >= 10, `Step ${step.id} instruction is too brief`);
        assert.ok(step.explanation.length >= 10, `Step ${step.id} explanation is too brief`);
        assert.ok(step.missingExplanation && step.missingExplanation.length >= 10, `Step ${step.id} missingExplanation is too brief`);
        // Target selector must be specific
        assert.ok(
          step.targetSelector.includes('[data-tutorial=') || step.targetSelector.includes('button') || step.targetSelector.includes('input'),
          `Step ${step.id} target selector must target an actionable element`
        );
      });
    });

    console.log('  ✔ Safety guarantees verified: fallback copy and clear actionable selectors on all steps');
  });
});
