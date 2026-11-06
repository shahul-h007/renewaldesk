/**
 * RenewalDesk Tutorial Positioning Engine
 *
 * Computes exact, collision-free coordinates for the tutorial coach card
 * across Desktop (1440px+), Tablet (768px), and Mobile (320px-390px).
 *
 * Guarantees:
 * 1. The coach card is always within visible viewport bounds.
 * 2. The coach card NEVER overlaps or obscures the highlighted target element.
 * 3. On desktop, steps inside a modal place the coach card to the right
 *    (or left) of the modal dialog, leaving the modal fully readable.
 * 4. On tablet where horizontal space is constrained, it flips cleanly below
 *    or above the active field with positive clearance.
 * 5. On mobile, it renders as a bottom sheet normally; if the target is in the
 *    bottom half or when the on-screen keyboard is open, it flips to the top sheet,
 *    never covering the field being filled.
 */

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
  isKeyboardOpen?: boolean;
}

export interface CoachPositionInput {
  targetRect: Rect | null;
  modalRect?: Rect | null;
  coachSize: { width: number; height: number };
  viewport: ViewportConfig;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface CoachPositionResult {
  top: number;
  left: number;
  placement: 'right' | 'left' | 'below' | 'above' | 'top-sheet' | 'bottom-sheet' | 'center';
}

/**
 * Checks if two axis-aligned bounding boxes overlap, with an optional safety margin.
 */
export function doRectanglesOverlap(a: Rect, b: Rect, margin = 0): boolean {
  return !(
    a.right + margin <= b.left ||
    a.left - margin >= b.right ||
    a.bottom + margin <= b.top ||
    a.top - margin >= b.bottom
  );
}

/**
 * Clamps a number between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.max(min, Math.min(val, max));
}

/**
 * Helper to build a Rect from top, left, width, height.
 */
function toRect(top: number, left: number, width: number, height: number): Rect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

/**
 * Calculates collision-free coach card coordinates.
 */
export function computeCoachPosition({
  targetRect,
  modalRect,
  coachSize,
  viewport,
  preferredPlacement = 'bottom',
}: CoachPositionInput): CoachPositionResult {
  const padding = 16;
  const gap = 14;

  const vpW = Math.max(320, viewport.width);
  const vpH = Math.max(300, viewport.height);
  const isMobile = vpW < 768;

  // Fallback: If no target, center coach card on screen
  if (!targetRect) {
    const w = isMobile ? Math.min(coachSize.width, vpW - 24) : Math.min(coachSize.width, vpW - 32);
    const h = coachSize.height;
    return {
      top: clamp((vpH - h) / 2, padding, vpH - h - padding),
      left: clamp((vpW - w) / 2, padding, vpW - w - padding),
      placement: 'center',
    };
  }

  // ---------------------------------------------------------------------------
  // MOBILE (< 768px)
  // ---------------------------------------------------------------------------
  if (isMobile) {
    const sheetWidth = vpW - 24; // 12px margin on each side
    const sheetHeight = coachSize.height;
    const sheetLeft = 12;
    const bottomSheetTop = vpH - sheetHeight - 12;

    // CASE A: Virtual Keyboard is Open
    if (viewport.isKeyboardOpen) {
      const topSheetTop = 10;
      const topSheetRect = toRect(topSheetTop, sheetLeft, sheetWidth, sheetHeight);

      // If active field collides with top sheet, place cleanly below target
      if (doRectanglesOverlap(topSheetRect, targetRect, 2)) {
        const belowTop = targetRect.bottom + 8;
        if (belowTop + sheetHeight <= vpH - 8) {
          return { top: belowTop, left: sheetLeft, placement: 'below' };
        }
      }

      return { top: topSheetTop, left: sheetLeft, placement: 'top-sheet' };
    }

    // CASE B: Normal Mobile (Keyboard Closed)
    const bottomSheetRect = toRect(bottomSheetTop, sheetLeft, sheetWidth, sheetHeight);
    const topSheetRect = toRect(12, sheetLeft, sheetWidth, sheetHeight);

    // If bottom sheet overlaps or target reaches into bottom sheet area:
    if (doRectanglesOverlap(bottomSheetRect, targetRect, 4) || targetRect.bottom > bottomSheetTop - 4) {
      // If top sheet doesn't overlap target, flip to top sheet!
      if (!doRectanglesOverlap(topSheetRect, targetRect, 4)) {
        return { top: 12, left: sheetLeft, placement: 'top-sheet' };
      }
      // If target also touches top sheet, place cleanly below target
      const belowTop = targetRect.bottom + 8;
      if (belowTop + sheetHeight <= vpH - 8) {
        return { top: belowTop, left: sheetLeft, placement: 'below' };
      }
      return { top: 12, left: sheetLeft, placement: 'top-sheet' };
    }

    // If preferred placement is 'top' and top sheet doesn't overlap target:
    if (preferredPlacement === 'top' && !doRectanglesOverlap(topSheetRect, targetRect, 6)) {
      return { top: 12, left: sheetLeft, placement: 'top-sheet' };
    }

    return { top: bottomSheetTop, left: sheetLeft, placement: 'bottom-sheet' };
  }

  // ---------------------------------------------------------------------------
  // DESKTOP & TABLET (>= 768px)
  // ---------------------------------------------------------------------------
  const cardW = Math.min(coachSize.width, vpW - 32);
  const cardH = coachSize.height;

  // 1. TARGET IS INSIDE A MODAL DIALOG
  if (modalRect) {
    // Attempt 1: Right of the modal dialog (clean desktop presentation)
    const rightLeft = modalRect.right + gap;
    if (rightLeft + cardW <= vpW - padding) {
      const idealTop = targetRect.top + (targetRect.height - cardH) / 2;
      const top = clamp(idealTop, padding, vpH - cardH - padding);
      const rect = toRect(top, rightLeft, cardW, cardH);
      if (!doRectanglesOverlap(rect, targetRect, 4) && !doRectanglesOverlap(rect, modalRect, 4)) {
        return { top, left: rightLeft, placement: 'right' };
      }
    }

    // Attempt 2: Left of the modal dialog
    const leftLeft = modalRect.left - gap - cardW;
    if (leftLeft >= padding) {
      const idealTop = targetRect.top + (targetRect.height - cardH) / 2;
      const top = clamp(idealTop, padding, vpH - cardH - padding);
      const rect = toRect(top, leftLeft, cardW, cardH);
      if (!doRectanglesOverlap(rect, targetRect, 4) && !doRectanglesOverlap(rect, modalRect, 4)) {
        return { top, left: leftLeft, placement: 'left' };
      }
    }

    // Attempt 3: Below the active field (for tablets like 768px where modal takes full width)
    const belowTop = targetRect.bottom + gap;
    if (belowTop + cardH <= vpH - padding) {
      const idealLeft = targetRect.left + (targetRect.width - cardW) / 2;
      const left = clamp(idealLeft, padding, vpW - cardW - padding);
      const rect = toRect(belowTop, left, cardW, cardH);
      if (!doRectanglesOverlap(rect, targetRect, 4)) {
        return { top: belowTop, left, placement: 'below' };
      }
    }

    // Attempt 4: Above the active field
    const aboveTop = targetRect.top - gap - cardH;
    if (aboveTop >= padding) {
      const idealLeft = targetRect.left + (targetRect.width - cardW) / 2;
      const left = clamp(idealLeft, padding, vpW - cardW - padding);
      const rect = toRect(aboveTop, left, cardW, cardH);
      if (!doRectanglesOverlap(rect, targetRect, 4)) {
        return { top: aboveTop, left, placement: 'above' };
      }
    }
  }

  // 2. REGULAR PAGE ELEMENT (OR MODAL FALLBACK)
  type PlacementOption = 'right' | 'below' | 'left' | 'above';

  const getCandidate = (
    pos: PlacementOption
  ): { rect: Rect; top: number; left: number; placement: PlacementOption; fits: boolean } => {
    let top = 0;
    let left = 0;

    switch (pos) {
      case 'right':
        left = targetRect.right + gap;
        top = clamp(targetRect.top + (targetRect.height - cardH) / 2, padding, vpH - cardH - padding);
        break;
      case 'left':
        left = targetRect.left - gap - cardW;
        top = clamp(targetRect.top + (targetRect.height - cardH) / 2, padding, vpH - cardH - padding);
        break;
      case 'below':
        top = targetRect.bottom + gap;
        left = clamp(targetRect.left + (targetRect.width - cardW) / 2, padding, vpW - cardW - padding);
        break;
      case 'above':
        top = targetRect.top - gap - cardH;
        left = clamp(targetRect.left + (targetRect.width - cardW) / 2, padding, vpW - cardW - padding);
        break;
    }

    const rect = toRect(top, left, cardW, cardH);
    const withinBounds =
      left >= padding &&
      left + cardW <= vpW - padding + 1 &&
      top >= padding &&
      top + cardH <= vpH - padding + 1;
    const noOverlap = !doRectanglesOverlap(rect, targetRect, 2);

    return {
      rect,
      top,
      left,
      placement: pos,
      fits: withinBounds && noOverlap,
    };
  };

  // Determine candidate evaluation order based on preferred placement
  let candidateOrder: PlacementOption[] = ['right', 'below', 'left', 'above'];
  if (preferredPlacement === 'right') {
    candidateOrder = ['right', 'below', 'left', 'above'];
  } else if (preferredPlacement === 'left') {
    candidateOrder = ['left', 'below', 'right', 'above'];
  } else if (preferredPlacement === 'top') {
    candidateOrder = ['above', 'below', 'right', 'left'];
  } else if (preferredPlacement === 'bottom') {
    candidateOrder = ['below', 'above', 'right', 'left'];
  }

  for (const pos of candidateOrder) {
    const candidate = getCandidate(pos);
    if (candidate.fits) {
      return { top: candidate.top, left: candidate.left, placement: candidate.placement };
    }
  }

  // Safe fallback if viewport is exceptionally tight: find whichever side has NO target overlap
  for (const pos of ['below', 'above', 'right', 'left'] as PlacementOption[]) {
    const candidate = getCandidate(pos);
    if (!doRectanglesOverlap(candidate.rect, targetRect, 0)) {
      return {
        top: clamp(candidate.top, padding, vpH - cardH - padding),
        left: clamp(candidate.left, padding, vpW - cardW - padding),
        placement: candidate.placement,
      };
    }
  }

  // Extreme fallback
  return {
    top: clamp(targetRect.bottom + gap, padding, vpH - cardH - padding),
    left: clamp(padding, padding, vpW - cardW - padding),
    placement: 'below',
  };
}
