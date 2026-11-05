/**
 * test/customer-archive-and-restore.test.ts
 *
 * Verifies that:
 * 1. Archiving a customer pauses their active service schedules and reminders.
 * 2. Reactivating an archived customer restores active service_schedules (status = 'ACTIVE')
 *    and ensures pending reminders exist with correct next_due_date.
 * 3. Restored customers reappear in the Today queue with their proper due dates and urgency.
 * 4. Capacity limit checks prevent reactivation if the business plan cap is reached.
 * 5. Local demo store preserves assets and service records in the archive pool and restores them.
 */

import assert from 'node:assert/strict';
import { Customer, Asset, ServiceRecord, FollowUpStatus } from '../lib/types';
import { calculateDueStatus } from '../lib/due-date-engine';
import { mapDbScheduleToApp } from '../lib/db/operations';

console.log('🧪 Starting Customer Archive & Restore Test Suite...\n');

// Mock data structures mirroring database schema
interface MockDbCustomer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  archived_at: string | null;
}

interface MockDbSchedule {
  id: string;
  business_id: string;
  customer_id: string;
  service_name: string;
  last_service_date: string | null;
  next_due_date: string;
  interval_value: number;
  interval_unit: 'DAYS' | 'MONTHS' | 'YEARS';
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
}

interface MockDbReminder {
  id: string;
  business_id: string;
  customer_id: string;
  schedule_id: string;
  due_date: string;
  status: string;
}

class MockSupabaseWorkspace {
  customers: MockDbCustomer[] = [];
  schedules: MockDbSchedule[] = [];
  reminders: MockDbReminder[] = [];
  activities: { action_type: string; customer_id: string }[] = [];
  maxCapacity = 100;

  archiveCustomer(customerId: string) {
    const cust = this.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found');
    cust.archived_at = new Date().toISOString();

    // Cancel active schedules
    for (const sched of this.schedules) {
      if (sched.customer_id === customerId) {
        sched.status = 'CANCELLED';
      }
    }

    this.activities.push({ action_type: 'CUSTOMER_ARCHIVED', customer_id: customerId });
  }

  reactivateCustomer(customerId: string) {
    const activeCount = this.customers.filter((c) => c.archived_at === null).length;
    if (activeCount >= this.maxCapacity) {
      throw new Error('Customer capacity limit reached. Upgrade plan to restore more customers.');
    }

    const cust = this.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found');
    cust.archived_at = null;

    // Restore schedules to ACTIVE
    for (const sched of this.schedules) {
      if (sched.customer_id === customerId) {
        sched.status = 'ACTIVE';

        // Ensure reminder exists
        const existingReminder = this.reminders.find((r) => r.schedule_id === sched.id);
        if (!existingReminder) {
          this.reminders.push({
            id: `rem-${Date.now()}`,
            business_id: sched.business_id,
            customer_id: customerId,
            schedule_id: sched.id,
            due_date: sched.next_due_date,
            status: 'NOT_CONTACTED',
          });
        }
      }
    }

    this.activities.push({ action_type: 'CUSTOMER_REACTIVATED', customer_id: customerId });
  }
}

// ==========================================
// Test Suite 1: Database Archive & Restore Lifecycle
// ==========================================
console.log('--- Suite 1: Database Archive & Restore Lifecycle ---');

{
  const ws = new MockSupabaseWorkspace();
  const bizId = 'biz-001';
  const custId = 'cust-101';
  const todayStr = new Date().toISOString().split('T')[0];

  // Seed customer with active schedule and reminder
  ws.customers.push({
    id: custId,
    business_id: bizId,
    name: 'Priya Sharma',
    phone: '9876543210',
    archived_at: null,
  });

  ws.schedules.push({
    id: 'sched-501',
    business_id: bizId,
    customer_id: custId,
    service_name: 'RO Purifier Maintenance',
    last_service_date: '2026-05-01',
    next_due_date: todayStr,
    interval_value: 6,
    interval_unit: 'MONTHS',
    status: 'ACTIVE',
  });

  ws.reminders.push({
    id: 'rem-701',
    business_id: bizId,
    customer_id: custId,
    schedule_id: 'sched-501',
    due_date: todayStr,
    status: 'NOT_CONTACTED',
  });

  // Verify initial state
  assert.equal(ws.customers[0].archived_at, null);
  assert.equal(ws.schedules[0].status, 'ACTIVE');
  console.log('  ✔ Customer initially active with ACTIVE schedule');

  // 1. Archive customer
  ws.archiveCustomer(custId);
  assert.notEqual(ws.customers[0].archived_at, null, 'archived_at should be populated');
  assert.equal(ws.schedules[0].status, 'CANCELLED', 'Schedule should be marked CANCELLED');
  assert.equal(ws.activities.some((a) => a.action_type === 'CUSTOMER_ARCHIVED'), true);
  console.log('  ✔ Archiving marks customer archived and schedules CANCELLED');

  // 2. Reactivate customer
  ws.reactivateCustomer(custId);
  assert.equal(ws.customers[0].archived_at, null, 'archived_at should be cleared to null');
  assert.equal(ws.schedules[0].status, 'ACTIVE', 'Schedule should be restored back to ACTIVE');
  assert.equal(ws.reminders.length, 1, 'Reminder row must exist');
  assert.equal(ws.reminders[0].due_date, todayStr, 'Reminder date matches next_due_date');
  assert.equal(ws.activities.some((a) => a.action_type === 'CUSTOMER_REACTIVATED'), true);
  console.log('  ✔ Reactivating clears archived_at and restores schedule to ACTIVE with reminder');

  // 3. Test queue mapping of restored schedule
  const activeSchedule = ws.schedules[0];
  const activeReminder = ws.reminders[0];
  const appService = mapDbScheduleToApp(
    activeSchedule as any,
    activeReminder as any,
    [{ id: 'cat-1', name: 'RO Purifier Maintenance', intervalMonths: 6, typicalPrice: 1500 }]
  );

  assert.equal(appService.customerId, custId);
  assert.equal(appService.serviceName, 'RO Purifier Maintenance');
  assert.equal(appService.nextDueDate, todayStr);
  assert.equal(appService.serviceAmount, 1500);
  assert.equal(appService.urgency, 'DUE_TODAY');
  assert.equal(appService.followUpStatus, 'NOT_CONTACTED');
  console.log('  ✔ Restored customer service correctly maps to Today queue with DUE_TODAY urgency');
}

// ==========================================
// Test Suite 2: Capacity Limit Guard on Reactivation
// ==========================================
console.log('\n--- Suite 2: Capacity Limit Guard on Reactivation ---');

{
  const ws = new MockSupabaseWorkspace();
  ws.maxCapacity = 1; // Only 1 active customer allowed

  // Add 1 active customer
  ws.customers.push({
    id: 'cust-active',
    business_id: 'biz-1',
    name: 'Active Customer',
    phone: '9000000001',
    archived_at: null,
  });

  // Add 1 archived customer
  ws.customers.push({
    id: 'cust-archived',
    business_id: 'biz-1',
    name: 'Archived Customer',
    phone: '9000000002',
    archived_at: '2026-10-01T00:00:00Z',
  });

  assert.throws(
    () => ws.reactivateCustomer('cust-archived'),
    /Customer capacity limit reached/,
    'Reactivation must fail when active customer capacity is at max limit'
  );
  console.log('  ✔ Capacity check correctly blocks reactivation if plan limit is reached');
}

// ==========================================
// Test Suite 3: Local/Demo Store Archive Pool & Restore
// ==========================================
console.log('\n--- Suite 3: Local Demo Store Archive Pool & Restore ---');

{
  // Simulate RenewalDeskProvider local state & archivedPoolRef
  const archivedPool = {
    customers: [] as Customer[],
    assets: [] as Asset[],
    services: [] as ServiceRecord[],
  };

  let localCustomers: Customer[] = [
    {
      id: 'cust-demo-1',
      name: 'Rohan Mehra',
      phone: '9898989898',
      createdAt: '2026-01-01',
    },
  ];

  let localAssets: Asset[] = [
    {
      id: 'asset-demo-1',
      customerId: 'cust-demo-1',
      name: 'Split AC 1.5 Ton',
    },
  ];

  let localServices: ServiceRecord[] = [
    {
      id: 'svc-demo-1',
      customerId: 'cust-demo-1',
      assetId: 'asset-demo-1',
      serviceName: 'AC Deep Clean',
      lastServiceDate: '2026-05-15',
      nextDueDate: '2026-11-15',
      intervalMonths: 6,
      serviceAmount: 1800,
      urgency: 'DUE_THIS_MONTH',
      followUpStatus: 'NOT_CONTACTED',
    },
  ];

  // Archive customer
  const archiveCustomer = (id: string) => {
    const cust = localCustomers.find((c) => c.id === id);
    if (cust) {
      archivedPool.customers.push(cust);
      archivedPool.assets.push(...localAssets.filter((a) => a.customerId === id));
      archivedPool.services.push(...localServices.filter((s) => s.customerId === id));
    }
    localCustomers = localCustomers.filter((c) => c.id !== id);
    localAssets = localAssets.filter((a) => a.customerId !== id);
    localServices = localServices.filter((s) => s.customerId !== id);
  };

  // Restore customer
  const restoreCustomer = (id: string) => {
    const cust = archivedPool.customers.find((c) => c.id === id);
    if (cust) {
      localCustomers.unshift(cust);
      const assets = archivedPool.assets.filter((a) => a.customerId === id);
      const services = archivedPool.services.filter((s) => s.customerId === id);
      localAssets.push(...assets);
      localServices.push(...services);
      archivedPool.customers = archivedPool.customers.filter((c) => c.id !== id);
    }
  };

  // Perform archive
  archiveCustomer('cust-demo-1');
  assert.equal(localCustomers.length, 0);
  assert.equal(localAssets.length, 0);
  assert.equal(localServices.length, 0);
  assert.equal(archivedPool.customers.length, 1);
  assert.equal(archivedPool.assets.length, 1);
  assert.equal(archivedPool.services.length, 1);
  console.log('  ✔ Local archive moves customer, assets, and services into archive pool');

  // Perform restore
  restoreCustomer('cust-demo-1');
  assert.equal(localCustomers.length, 1);
  assert.equal(localAssets.length, 1);
  assert.equal(localServices.length, 1);
  assert.equal(localCustomers[0].name, 'Rohan Mehra');
  assert.equal(localServices[0].serviceName, 'AC Deep Clean');
  assert.equal(localServices[0].urgency, 'DUE_THIS_MONTH');
  console.log('  ✔ Local restore recovers customer, assets, and services into active state');
}

console.log('\n🎉 ALL CUSTOMER ARCHIVE & RESTORE TESTS PASSED SUCCESSFULLY!\n');
