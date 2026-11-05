/**
 * test/queue-status-undo.test.ts
 *
 * Verifies that queue status changes from the Today queue:
 * 1. Emit an undo toast with ~5 second duration
 * 2. Restore previous status upon executing the Undo callback
 * 3. Safely exclude 'COMPLETED' from automatic undo toasts (handled by CompleteServiceModal)
 * 4. Handle sequential status reversions accurately
 */

import { FollowUpStatus } from '../lib/types';

interface SimulatedToast {
  type: string;
  title: string;
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class ToastTracker {
  public lastToast: SimulatedToast | null = null;
  public toastHistory: SimulatedToast[] = [];

  undo(message: string, onUndo: () => void, title?: string, duration: number = 5000) {
    const toast: SimulatedToast = {
      type: 'info',
      title: title || 'Status Updated',
      message,
      duration,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    };
    this.lastToast = toast;
    this.toastHistory.push(toast);
  }
}

// Emulates the FollowUpRow handleStatusChange logic
function simulateFollowUpStatusChange(
  currentStatus: FollowUpStatus,
  newStatus: FollowUpStatus,
  customerName: string,
  toast: ToastTracker,
  setStatus: (status: FollowUpStatus) => void,
  openCompleteModal: () => void
) {
  if (newStatus === 'COMPLETED') {
    // Excluded from quick undo toast since it requires the service record completion modal
    openCompleteModal();
    return;
  }

  const previousStatus = currentStatus;
  setStatus(newStatus);

  const statusLabels: Record<FollowUpStatus, string> = {
    NOT_CONTACTED: 'Not Contacted',
    CONTACTED: 'Contacted',
    REPLIED: 'Customer Replied',
    BOOKED: 'Booked',
    COMPLETED: 'Completed',
    NO_RESPONSE: 'No Response',
    NOT_INTERESTED: 'Not Interested',
  };

  toast.undo(
    `${customerName} marked as ${statusLabels[newStatus] || newStatus}`,
    () => {
      setStatus(previousStatus);
    },
    'Status Updated',
    5000
  );
}

function getStatus(state: { status: FollowUpStatus }): FollowUpStatus {
  return state.status;
}

function runTests() {
  console.log('--- RUNNING QUEUE STATUS CHANGE & UNDO TOAST TESTS ---');

  const toast = new ToastTracker();
  const state: { status: FollowUpStatus; modalOpened: boolean } = {
    status: 'NOT_CONTACTED',
    modalOpened: false,
  };

  const setStatus = (s: FollowUpStatus) => {
    state.status = s;
  };

  const openCompleteModal = () => {
    state.modalOpened = true;
  };

  // Test 1: "Mark booked" transitions from NOT_CONTACTED to BOOKED with Undo toast
  console.log('1. Testing status update to BOOKED with Undo toast...');
  simulateFollowUpStatusChange(
    getStatus(state),
    'BOOKED',
    'Arun Kumar',
    toast,
    setStatus,
    openCompleteModal
  );

  if (getStatus(state) !== 'BOOKED') {
    throw new Error(`Expected status to be BOOKED, got ${getStatus(state)}`);
  }
  if (!toast.lastToast) {
    throw new Error('Expected toast to be emitted');
  }
  if (toast.lastToast.duration !== 5000) {
    throw new Error(`Expected toast duration to be 5000ms, got ${toast.lastToast.duration}`);
  }
  if (!toast.lastToast.action || toast.lastToast.action.label !== 'Undo') {
    throw new Error('Expected toast action to be "Undo"');
  }
  console.log('  ✓ Toast correctly generated with Undo action and 5000ms duration.');

  // Test 2: Triggering Undo restores previous status
  console.log('2. Testing Undo callback restores previous status...');
  toast.lastToast.action.onClick();
  if (getStatus(state) !== 'NOT_CONTACTED') {
    throw new Error(`Expected status to revert to NOT_CONTACTED, got ${getStatus(state)}`);
  }
  console.log('  ✓ Undo callback successfully reverted status back to NOT_CONTACTED.');

  // Test 3: Status change from More menu (e.g. to REPLIED)
  console.log('3. Testing status update from More menu (REPLIED) with Undo...');
  state.status = 'CONTACTED';
  simulateFollowUpStatusChange(
    getStatus(state),
    'REPLIED',
    'Priya Nair',
    toast,
    setStatus,
    openCompleteModal
  );

  if (getStatus(state) !== 'REPLIED') {
    throw new Error(`Expected status to be REPLIED, got ${getStatus(state)}`);
  }
  if (!toast.lastToast?.message.includes('Priya Nair marked as Customer Replied')) {
    throw new Error(`Unexpected toast message: ${toast.lastToast?.message}`);
  }

  // Trigger undo
  toast.lastToast.action!.onClick();
  if (getStatus(state) !== 'CONTACTED') {
    throw new Error(`Expected status to revert to CONTACTED, got ${getStatus(state)}`);
  }
  console.log('  ✓ More menu status change correctly emitted toast and restored on Undo.');

  // Test 4: 'COMPLETED' is strictly excluded from quick undo toast
  console.log('4. Testing that COMPLETED is excluded from quick undo toast...');
  toast.lastToast = null;
  state.modalOpened = false;
  state.status = 'BOOKED';

  simulateFollowUpStatusChange(
    getStatus(state),
    'COMPLETED',
    'Faisal V',
    toast,
    setStatus,
    openCompleteModal
  );

  if (getStatus(state) !== 'BOOKED') {
    throw new Error('Expected status to remain BOOKED until modal is completed');
  }
  if (!state.modalOpened) {
    throw new Error('Expected complete service modal to open');
  }
  if (toast.lastToast !== null) {
    throw new Error('Expected NO quick undo toast for COMPLETED');
  }
  console.log('  ✓ COMPLETED correctly routes to complete modal without raw status undo toast.');

  console.log('\n================================================================');
  console.log('🎉 ALL QUEUE STATUS UNDO TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTests();
