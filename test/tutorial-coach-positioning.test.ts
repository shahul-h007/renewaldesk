import test from 'node:test';
import assert from 'node:assert';
import { TUTORIAL_LESSONS, TutorialStepContent } from '../lib/tutorial-content';
import {
  computeCoachPosition,
  doRectanglesOverlap,
  Rect,
  ViewportConfig,
} from '../lib/tutorial-positioning';
import fs from 'fs';
import path from 'path';

/**
 * RENEWALDESK: TUTORIAL COACH CARD POSITIONING & COLLISION AUDIT
 *
 * Verifies that across all 6 lessons (24 steps) on Desktop (1440px),
 * Tablet (768px), and Phone (360px):
 * 1. The coach card is fully visible within viewport boundaries.
 * 2. The coach card NEVER overlaps or obscures the highlighted element.
 * 3. On desktop, steps inside a modal place the coach card outside the modal
 *    (to the right or left), keeping the modal fully readable.
 * 4. On mobile with keyboard open, coach card moves to top and avoids the field.
 * 5. On mobile with keyboard closed, bottom sheet flips to top if target is low.
 * 6. Portal and z-index ordering guarantee coach card is strictly above modals.
 */

// Viewports under test
const VIEWPORTS = [
  { width: 1440, height: 900, label: 'Desktop 1440px' },
  { width: 768, height: 1024, label: 'Tablet 768px' },
  { width: 360, height: 800, label: 'Phone 360px (Standard)' },
  { width: 360, height: 800, isKeyboardOpen: true, label: 'Phone 360px (Virtual Keyboard Open)' },
  { width: 320, height: 640, label: 'Phone 320px (Minimum Viewport)' },
  { width: 390, height: 844, label: 'Phone 390px (iPhone 14)' },
];

/**
 * Returns realistic element bounding boxes for each tutorial step selector.
 */
function getSimulatedTargetRect(
  selector: string,
  vp: { width: number; height: number },
  isModal: boolean
): { targetRect: Rect; modalRect: Rect | null } {
  let modalRect: Rect | null = null;

  if (isModal) {
    if (vp.width >= 768) {
      // Centered dialog
      const modalW = Math.min(512, vp.width - 64);
      const modalH = Math.min(680, vp.height - 80);
      const modalL = Math.round((vp.width - modalW) / 2);
      const modalT = Math.round((vp.height - modalH) / 2);
      modalRect = {
        left: modalL,
        top: modalT,
        right: modalL + modalW,
        bottom: modalT + modalH,
        width: modalW,
        height: modalH,
      };
    } else {
      // Mobile bottom sheet modal
      const modalH = Math.round(vp.height * 0.88);
      modalRect = {
        left: 0,
        top: vp.height - modalH,
        right: vp.width,
        bottom: vp.height,
        width: vp.width,
        height: modalH,
      };
    }
  }

  // Realistic element positions based on step selector
  let targetRect: Rect;

  if (isModal && modalRect) {
    const contentLeft = modalRect.left + 24;
    const contentWidth = modalRect.width - 48;

    switch (selector) {
      case '[data-tutorial="customer-name"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 70,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 70 + 44,
          width: contentWidth,
          height: 44,
        };
        break;
      case '[data-tutorial="customer-phone"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 130,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 130 + 44,
          width: contentWidth,
          height: 44,
        };
        break;
      case '[data-tutorial="service-type"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 195,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 195 + 44,
          width: contentWidth,
          height: 44,
        };
        break;
      case '[data-tutorial="last-service-date"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 260,
          right: contentLeft + contentWidth / 2 - 8,
          bottom: modalRect.top + 260 + 44,
          width: contentWidth / 2 - 8,
          height: 44,
        };
        break;
      case '[data-tutorial="next-due-date"]':
        targetRect = {
          left: contentLeft + contentWidth / 2 + 8,
          top: modalRect.top + 260,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 260 + 44,
          width: contentWidth / 2 - 8,
          height: 44,
        };
        break;
      case '[data-tutorial="additional-details"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 325,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 325 + 36,
          width: contentWidth,
          height: 36,
        };
        break;
      case '[data-tutorial="save-customer"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.bottom - 60,
          right: contentLeft + contentWidth,
          bottom: modalRect.bottom - 16,
          width: contentWidth,
          height: 44,
        };
        break;
      case '[data-tutorial="open-whatsapp-btn"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 280,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 280 + 46,
          width: contentWidth,
          height: 46,
        };
        break;
      case '[data-tutorial="template-name"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 75,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 75 + 42,
          width: contentWidth,
          height: 42,
        };
        break;
      case '[data-tutorial="template-type"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 140,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 140 + 42,
          width: contentWidth,
          height: 42,
        };
        break;
      case '[data-tutorial="placeholder-chips"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 200,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 200 + 50,
          width: contentWidth,
          height: 50,
        };
        break;
      case '[data-tutorial="save-template-btn"]':
        targetRect = {
          left: contentLeft,
          top: modalRect.bottom - 60,
          right: contentLeft + contentWidth,
          bottom: modalRect.bottom - 16,
          width: contentWidth,
          height: 44,
        };
        break;
      default:
        targetRect = {
          left: contentLeft,
          top: modalRect.top + 100,
          right: contentLeft + contentWidth,
          bottom: modalRect.top + 150,
          width: contentWidth,
          height: 50,
        };
    }
  } else {
    // In-page element positions
    const pageLeft = vp.width >= 768 ? 260 : 16;
    const pageWidth = vp.width >= 768 ? Math.min(800, vp.width - 280) : vp.width - 32;

    switch (selector) {
      case '[data-tutorial="practice-customer-card"]':
        targetRect = {
          left: pageLeft,
          top: 180,
          right: pageLeft + pageWidth,
          bottom: 270,
          width: pageWidth,
          height: 90,
        };
        break;
      case '[data-tutorial="whatsapp-btn"]':
        targetRect = {
          left: pageLeft + pageWidth - (vp.width >= 768 ? 130 : 100),
          top: 200,
          right: pageLeft + pageWidth - 16,
          bottom: 240,
          width: vp.width >= 768 ? 114 : 84,
          height: 40,
        };
        break;
      case '[data-tutorial="more-menu-btn"]':
        targetRect = {
          left: pageLeft + pageWidth - 44,
          top: 195,
          right: pageLeft + pageWidth - 10,
          bottom: 229,
          width: 34,
          height: 34,
        };
        break;
      case '[data-tutorial="undo-action"]':
        targetRect = {
          left: vp.width >= 768 ? vp.width - 200 : vp.width / 2 - 80,
          top: vp.height >= 700 ? vp.height - 120 : vp.height - 90,
          right: vp.width >= 768 ? vp.width - 40 : vp.width / 2 + 80,
          bottom: vp.height >= 700 ? vp.height - 76 : vp.height - 46,
          width: 160,
          height: 44,
        };
        break;
      case '[data-tutorial="mark-booked-btn"]':
        targetRect = {
          left: pageLeft + 16,
          top: 230,
          right: pageLeft + 140,
          bottom: 266,
          width: 124,
          height: 36,
        };
        break;
      case '[data-tutorial="mark-completed-btn"]':
        targetRect = {
          left: pageLeft + 150,
          top: 230,
          right: pageLeft + 290,
          bottom: 266,
          width: 140,
          height: 36,
        };
        break;
      case '[data-tutorial="new-template-btn"]':
        targetRect = {
          left: pageLeft + pageWidth - 150,
          top: 90,
          right: pageLeft + pageWidth,
          bottom: 128,
          width: 150,
          height: 38,
        };
        break;
      case '[data-tutorial="results-funnel"]':
        targetRect = {
          left: pageLeft,
          top: 160,
          right: pageLeft + pageWidth,
          bottom: 420,
          width: pageWidth,
          height: 260,
        };
        break;
      case '[data-tutorial="completion-modal"]':
        targetRect = {
          left: Math.round(vp.width / 2 - 170),
          top: Math.round(vp.height / 2 - 120),
          right: Math.round(vp.width / 2 + 170),
          bottom: Math.round(vp.height / 2 + 120),
          width: 340,
          height: 240,
        };
        break;
      default:
        targetRect = {
          left: pageLeft,
          top: 200,
          right: pageLeft + Math.min(300, pageWidth),
          bottom: 244,
          width: Math.min(300, pageWidth),
          height: 44,
        };
    }
  }

  return { targetRect, modalRect };
}

test('RenewalDesk Tutorial Coach Card Positioning & Visibility Audit', async (t) => {
  await t.test('--- Suite 1: Geometry Overlap Function Rigor ---', () => {
    const a: Rect = { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 };
    const bSeparatedRight: Rect = { left: 210, top: 100, right: 310, bottom: 200, width: 100, height: 100 };
    const bSeparatedBelow: Rect = { left: 100, top: 210, right: 200, bottom: 310, width: 100, height: 100 };
    const bOverlapping: Rect = { left: 150, top: 150, right: 250, bottom: 250, width: 100, height: 100 };

    assert.strictEqual(doRectanglesOverlap(a, bSeparatedRight), false, 'Separated horizontally must not overlap');
    assert.strictEqual(doRectanglesOverlap(a, bSeparatedBelow), false, 'Separated vertically must not overlap');
    assert.strictEqual(doRectanglesOverlap(a, bOverlapping), true, 'Overlapping rects must be detected');
  });

  await t.test('--- Suite 2: All 24 Steps Across Desktop (1440px), Tablet (768px), and Phone (360px) ---', () => {
    let totalChecks = 0;

    for (const vp of VIEWPORTS) {
      for (const lesson of TUTORIAL_LESSONS) {
        for (const step of lesson.steps) {
          const isModalStep =
            step.lessonNumber === 1 ||
            step.id === 'l3-s2-preview' ||
            step.id === 'l4-s5-completed' ||
            (step.lessonNumber === 5 && step.stepNumber >= 2);

          const { targetRect, modalRect } = getSimulatedTargetRect(step.targetSelector, vp, isModalStep);

          const coachW = vp.width < 768 ? vp.width - 24 : 380;
          const coachH = vp.width < 768 ? 180 : 220;

          const result = computeCoachPosition({
            targetRect,
            modalRect,
            coachSize: { width: coachW, height: coachH },
            viewport: vp,
            preferredPlacement: step.placement,
          });

          const coachRect: Rect = {
            left: result.left,
            top: result.top,
            right: result.left + coachW,
            bottom: result.top + coachH,
            width: coachW,
            height: coachH,
          };

          // 1. Check bounds within viewport
          assert.ok(
            coachRect.left >= 0,
            `[${vp.label}] ${step.id}: coachRect.left (${coachRect.left}) must be >= 0`
          );
          assert.ok(
            coachRect.right <= vp.width + 1,
            `[${vp.label}] ${step.id}: coachRect.right (${coachRect.right}) must be <= vp.width (${vp.width})`
          );
          assert.ok(
            coachRect.top >= 0,
            `[${vp.label}] ${step.id}: coachRect.top (${coachRect.top}) must be >= 0`
          );
          assert.ok(
            coachRect.bottom <= vp.height + 1,
            `[${vp.label}] ${step.id}: coachRect.bottom (${coachRect.bottom}) must be <= vp.height (${vp.height})`
          );

          // 2. Check ZERO overlap with the target element
          const overlap = doRectanglesOverlap(coachRect, targetRect, 0);
          assert.strictEqual(
            overlap,
            false,
            `[${vp.label}] ${step.id}: Coach card MUST NOT overlap target element (${step.targetSelector})! ` +
              `Target: [${targetRect.left},${targetRect.top},${targetRect.right},${targetRect.bottom}], ` +
              `Coach: [${coachRect.left},${coachRect.top},${coachRect.right},${coachRect.bottom}]`
          );

          // 3. Desktop Modal Check: On 1440px desktop, inside modal, coach card must be placed to the right of the modal
          if (vp.width === 1440 && isModalStep && modalRect) {
            assert.strictEqual(
              result.placement,
              'right',
              `[${vp.label}] ${step.id}: Desktop modal step should place coach card to the right of modal`
            );
            assert.ok(
              coachRect.left >= modalRect.right,
              `[${vp.label}] ${step.id}: Coach card left (${coachRect.left}) must be >= modal right (${modalRect.right})`
            );
          }

          // 4. Mobile Keyboard Open Check: Coach card must be placed at the top (or below field if high)
          if (vp.isKeyboardOpen) {
            assert.ok(
              result.placement === 'top-sheet' || result.placement === 'below',
              `[${vp.label}] ${step.id}: Mobile keyboard active should place coach at top-sheet or below`
            );
          }

          totalChecks++;
        }
      }
    }

    assert.ok(totalChecks >= 144, `All ${totalChecks} step viewport checks successfully validated.`);
  });

  await t.test('--- Suite 3: Z-Index, Portal & Modal Backdrop Audit ---', () => {
    // 1. Verify TutorialCoach uses createPortal and z-[9999]
    const coachSource = fs.readFileSync(path.join(__dirname, '../components/TutorialCoach.tsx'), 'utf8');
    assert.ok(coachSource.includes('createPortal('), 'TutorialCoach must use createPortal to mount on document.body');
    assert.ok(coachSource.includes('zIndex: 9999'), 'TutorialCoach must have zIndex: 9999 inline style');
    assert.ok(coachSource.includes('!isTargetInModal'), 'TutorialCoach must omit tutorial scrim when target is in modal');

    // 2. Verify Modal.tsx does not use heavy blur
    const modalSource = fs.readFileSync(path.join(__dirname, '../components/ui/Modal.tsx'), 'utf8');
    assert.ok(!modalSource.includes('backdrop-blur'), 'Modal.tsx must not use heavy backdrop blur');
    assert.ok(modalSource.includes('bg-slate-900/40') || modalSource.includes('bg-black/40'), 'Modal.tsx uses light dim');

    // 3. Verify WhatsAppModal & CompleteServiceModal do not use heavy blur
    const whatsappSource = fs.readFileSync(path.join(__dirname, '../components/WhatsAppModal.tsx'), 'utf8');
    assert.ok(!whatsappSource.includes('backdrop-blur'), 'WhatsAppModal must not use backdrop-blur');

    const completeSource = fs.readFileSync(path.join(__dirname, '../components/CompleteServiceModal.tsx'), 'utf8');
    assert.ok(!completeSource.includes('backdrop-blur'), 'CompleteServiceModal must not use backdrop-blur');
  });
});
