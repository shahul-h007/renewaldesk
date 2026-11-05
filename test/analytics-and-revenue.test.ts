import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDateRangeBounds,
  isDateInRange,
  isValidIsoDate,
  calculateResultsAnalytics,
  AnalyticsPeriod,
} from '../lib/analytics-utils';
import { Customer, ServiceRecord, CompletedServiceRecord } from '../lib/types';

describe('Analytics & Revenue Engine', () => {
  const refDate = '2026-10-15';

  describe('Date Range Bounds', () => {
    it('calculates ALL_TIME with null start and end dates', () => {
      const bounds = getDateRangeBounds('ALL_TIME', refDate);
      assert.equal(bounds.period, 'ALL_TIME');
      assert.equal(bounds.startDate, null);
      assert.equal(bounds.endDate, null);
      assert.equal(bounds.label, 'All Time');
    });

    it('calculates THIS_MONTH for October 2026', () => {
      const bounds = getDateRangeBounds('THIS_MONTH', refDate);
      assert.equal(bounds.period, 'THIS_MONTH');
      assert.equal(bounds.startDate, '2026-10-01');
      assert.equal(bounds.endDate, '2026-10-31');
    });

    it('calculates LAST_30_DAYS correctly', () => {
      const bounds = getDateRangeBounds('LAST_30_DAYS', refDate);
      assert.equal(bounds.period, 'LAST_30_DAYS');
      assert.equal(bounds.endDate, '2026-10-15');
      assert.equal(bounds.startDate, '2026-09-16');
    });

    it('calculates THIS_QUARTER for October (Q4)', () => {
      const bounds = getDateRangeBounds('THIS_QUARTER', refDate);
      assert.equal(bounds.period, 'THIS_QUARTER');
      assert.equal(bounds.startDate, '2026-10-01');
      assert.equal(bounds.endDate, '2026-12-31');
      assert.match(bounds.label, /Q4 2026/);
    });

    it('calculates THIS_QUARTER for February (Q1)', () => {
      const bounds = getDateRangeBounds('THIS_QUARTER', '2026-02-10');
      assert.equal(bounds.startDate, '2026-01-01');
      assert.equal(bounds.endDate, '2026-03-31');
      assert.match(bounds.label, /Q1 2026/);
    });
  });

  describe('isDateInRange and isValidIsoDate', () => {
    it('validates ISO dates correctly', () => {
      assert.equal(isValidIsoDate('2026-10-15'), true);
      assert.equal(isValidIsoDate('2026-10-15T12:00:00Z'), true);
      assert.equal(isValidIsoDate(''), false);
      assert.equal(isValidIsoDate(null), false);
      assert.equal(isValidIsoDate(undefined), false);
      assert.equal(isValidIsoDate('not-a-date'), false);
    });

    it('filters dates based on bounds', () => {
      const monthBounds = getDateRangeBounds('THIS_MONTH', refDate);
      assert.equal(isDateInRange('2026-10-05', monthBounds), true);
      assert.equal(isDateInRange('2026-10-31', monthBounds), true);
      assert.equal(isDateInRange('2026-09-30', monthBounds), false);
      assert.equal(isDateInRange('2026-11-01', monthBounds), false);
      assert.equal(isDateInRange(null, monthBounds), false);
      assert.equal(isDateInRange('invalid', monthBounds), false);
    });

    it('includes all valid dates in ALL_TIME bounds', () => {
      const allBounds = getDateRangeBounds('ALL_TIME', refDate);
      assert.equal(isDateInRange('2020-01-01', allBounds), true);
      assert.equal(isDateInRange('2030-12-31', allBounds), true);
      assert.equal(isDateInRange(null, allBounds), false);
    });
  });

  describe('calculateResultsAnalytics with Zero State', () => {
    it('safely handles empty workspace without NaN or division by zero', () => {
      const result = calculateResultsAnalytics({
        customers: [],
        services: [],
        serviceHistory: [],
        period: 'THIS_MONTH',
        referenceDate: refDate,
      });

      assert.equal(result.totalCustomers, 0);
      assert.equal(result.customersWithActiveCycles, 0);
      assert.equal(result.activeCycleCoveragePct, 0);
      assert.equal(result.schedulesDueInPeriodCount, 0);
      assert.equal(result.customersDueInPeriodCount, 0);
      assert.equal(result.overdueSchedulesInPeriodCount, 0);
      assert.equal(result.upcomingSchedulesInPeriodCount, 0);
      assert.equal(result.completedServicesCount, 0);
      assert.equal(result.confirmedRevenue, 0);
      assert.equal(result.averageTicketSize, 0);
      assert.equal(result.projectedDuePipeline, 0);

      // Verify funnel does not have hardcoded 100% when totalDue is 0
      assert.equal(result.funnelStages[0].count, 0);
      assert.equal(result.funnelStages[0].pct, 0);
      assert.equal(result.funnelStages[1].pct, 0);
      assert.equal(result.funnelStages[2].pct, 0);
      assert.equal(result.funnelStages[3].pct, 0);
      assert.equal(result.funnelStages[4].pct, 0);
    });
  });

  describe('Customer Deduplication Across Multiple Assets / Schedules', () => {
    const singleCustomer: Customer[] = [
      {
        id: 'cust-1',
        name: 'Kavitha Nair',
        phone: '9846011111',
        address: 'Villa 10',
        createdAt: '2026-01-01',
      },
    ];

    // Customer has 3 different ACs with 3 recurring service schedules
    const multiSchedules: ServiceRecord[] = [
      {
        id: 'sched-1',
        customerId: 'cust-1',
        assetId: 'asset-1',
        serviceName: 'Master Bed AC',
        lastServiceDate: '2026-04-10',
        nextDueDate: '2026-10-10', // Overdue relative to 2026-10-15
        intervalMonths: 6,
        serviceAmount: 1200,
        urgency: 'OVERDUE',
        followUpStatus: 'NOT_CONTACTED',
      },
      {
        id: 'sched-2',
        customerId: 'cust-1',
        assetId: 'asset-2',
        serviceName: 'Living Room AC',
        lastServiceDate: '2026-04-20',
        nextDueDate: '2026-10-20', // Upcoming this month
        intervalMonths: 6,
        serviceAmount: 1500,
        urgency: 'DUE_THIS_MONTH',
        followUpStatus: 'NOT_CONTACTED',
      },
      {
        id: 'sched-3',
        customerId: 'cust-1',
        assetId: 'asset-3',
        serviceName: 'Guest Bed AC',
        lastServiceDate: '2026-05-15',
        nextDueDate: '2026-11-15', // Next month (not in October)
        intervalMonths: 6,
        serviceAmount: 900,
        urgency: 'FUTURE',
        followUpStatus: 'NOT_CONTACTED',
      },
    ];

    it('deduplicates customer counts across multiple schedules', () => {
      const result = calculateResultsAnalytics({
        customers: singleCustomer,
        services: multiSchedules,
        serviceHistory: [],
        period: 'THIS_MONTH',
        referenceDate: refDate,
      });

      assert.equal(result.totalCustomers, 1);
      assert.equal(result.customersWithActiveCycles, 1);
      assert.equal(result.activeCycleCoveragePct, 100);

      // In October, sched-1 (Oct 10) and sched-2 (Oct 20) are due
      assert.equal(result.schedulesDueInPeriodCount, 2);
      // But only 1 distinct customer is due!
      assert.equal(result.customersDueInPeriodCount, 1);

      // Overdue: sched-1 is overdue, 1 distinct customer
      assert.equal(result.overdueSchedulesInPeriodCount, 1);
      assert.equal(result.overdueCustomersInPeriodCount, 1);

      // Upcoming: sched-2 is upcoming in October, 1 distinct customer
      assert.equal(result.upcomingSchedulesInPeriodCount, 1);
      assert.equal(result.upcomingCustomersInPeriodCount, 1);

      // Pipeline for October = 1200 + 1500 = 2700 (sched-3 is Nov, not included)
      assert.equal(result.projectedDuePipeline, 2700);
    });
  });

  describe('Missing and Invalid Next Due Dates', () => {
    const customers: Customer[] = [
      { id: 'c-1', name: 'John Doe', phone: '9846000001', address: 'Road 1', createdAt: '2026-01-01' },
      { id: 'c-2', name: 'Jane Smith', phone: '9846000002', address: 'Road 2', createdAt: '2026-01-01' },
    ];

    const schedules: ServiceRecord[] = [
      {
        id: 's-valid',
        customerId: 'c-1',
        assetId: 'a-1',
        serviceName: 'Valid Schedule',
        lastServiceDate: '2026-04-10',
        nextDueDate: '2026-10-10',
        intervalMonths: 6,
        serviceAmount: 1000,
        urgency: 'OVERDUE',
        followUpStatus: 'NOT_CONTACTED',
      },
      {
        id: 's-null-due',
        customerId: 'c-2',
        assetId: 'a-2',
        serviceName: 'Corrupted Schedule 1',
        lastServiceDate: '2026-04-10',
        nextDueDate: '', // missing
        intervalMonths: 6,
        serviceAmount: 1200,
        urgency: 'FUTURE',
        followUpStatus: 'NOT_CONTACTED',
      },
      {
        id: 's-garbage-due',
        customerId: 'c-2',
        assetId: 'a-3',
        serviceName: 'Corrupted Schedule 2',
        lastServiceDate: '2026-04-10',
        nextDueDate: 'invalid-string', // corrupted
        intervalMonths: 6,
        serviceAmount: 1400,
        urgency: 'FUTURE',
        followUpStatus: 'NOT_CONTACTED',
      },
    ];

    it('isolates missing and invalid due dates and never classifies them as due or overdue', () => {
      const result = calculateResultsAnalytics({
        customers,
        services: schedules,
        serviceHistory: [],
        period: 'ALL_TIME',
        referenceDate: refDate,
      });

      assert.equal(result.schedulesWithInvalidDueDateCount, 2);
      assert.equal(result.customersWithInvalidDueDateCount, 1); // c-2 has 2 invalid schedules

      // Only the 1 valid schedule should be counted as due
      assert.equal(result.schedulesDueInPeriodCount, 1);
      assert.equal(result.customersDueInPeriodCount, 1);
      assert.equal(result.overdueSchedulesInPeriodCount, 1);
    });
  });

  describe('Revenue Calculation & Funnel Conversion', () => {
    const customers: Customer[] = [
      { id: 'c-1', name: 'Arun', phone: '9846011111', address: 'Apt 1', createdAt: '2026-01-01' },
      { id: 'c-2', name: 'Binu', phone: '9846022222', address: 'Apt 2', createdAt: '2026-01-01' },
      { id: 'c-3', name: 'Chitra', phone: '9846033333', address: 'Apt 3', createdAt: '2026-01-01' },
      { id: 'c-4', name: 'Deepa', phone: '9846044444', address: 'Apt 4', createdAt: '2026-01-01' },
    ];

    const services: ServiceRecord[] = [
      {
        id: 's-1',
        customerId: 'c-1',
        assetId: 'a-1',
        serviceName: 'Service A',
        lastServiceDate: '2026-04-01',
        nextDueDate: '2026-10-05',
        intervalMonths: 6,
        serviceAmount: 1000,
        urgency: 'OVERDUE',
        followUpStatus: 'NOT_CONTACTED',
      },
      {
        id: 's-2',
        customerId: 'c-2',
        assetId: 'a-2',
        serviceName: 'Service B',
        lastServiceDate: '2026-04-01',
        nextDueDate: '2026-10-08',
        intervalMonths: 6,
        serviceAmount: 1200,
        urgency: 'OVERDUE',
        followUpStatus: 'CONTACTED',
      },
      {
        id: 's-3',
        customerId: 'c-3',
        assetId: 'a-3',
        serviceName: 'Service C',
        lastServiceDate: '2026-04-01',
        nextDueDate: '2026-10-12',
        intervalMonths: 6,
        serviceAmount: 1500,
        urgency: 'OVERDUE',
        followUpStatus: 'REPLIED',
      },
      {
        id: 's-4',
        customerId: 'c-4',
        assetId: 'a-4',
        serviceName: 'Service D',
        lastServiceDate: '2026-04-01',
        nextDueDate: '2026-10-14',
        intervalMonths: 6,
        serviceAmount: 1800,
        urgency: 'OVERDUE',
        followUpStatus: 'BOOKED',
      },
    ];

    const serviceHistory: CompletedServiceRecord[] = [
      {
        id: 'rec-1',
        customerId: 'c-1',
        serviceName: 'Service A Past',
        serviceDate: '2026-10-02', // In October
        feeCharged: 1100,
        status: 'COMPLETED',
      },
      {
        id: 'rec-2',
        customerId: 'c-2',
        serviceName: 'Service B Past',
        serviceDate: '2026-10-10', // In October
        feeCharged: 1300,
        status: 'COMPLETED',
      },
      {
        id: 'rec-3',
        customerId: 'c-3',
        serviceName: 'Old Summer Service',
        serviceDate: '2026-05-15', // NOT in October
        feeCharged: 2500,
        status: 'COMPLETED',
      },
    ];

    it('calculates confirmed revenue strictly from completed history within the selected period', () => {
      const result = calculateResultsAnalytics({
        customers,
        services,
        serviceHistory,
        period: 'THIS_MONTH',
        referenceDate: refDate,
      });

      // In October, rec-1 (1100) and rec-2 (1300) occurred = 2400.
      // rec-3 (May) must be excluded!
      assert.equal(result.completedServicesCount, 2);
      assert.equal(result.completedCustomersCount, 2);
      assert.equal(result.confirmedRevenue, 2400);
      assert.equal(result.averageTicketSize, 1200);

      // Projected due pipeline is 1000 + 1200 + 1500 + 1800 = 5500
      assert.equal(result.projectedDuePipeline, 5500);

      // Verify Funnel counts & percentages:
      // Due: 4 (100%)
      assert.equal(result.funnelStages[0].count, 4);
      assert.equal(result.funnelStages[0].pct, 100);

      // Contacted: s-2 (CONTACTED), s-3 (REPLIED), s-4 (BOOKED) = 3 of 4 = 75%
      assert.equal(result.funnelStages[1].count, 3);
      assert.equal(result.funnelStages[1].pct, 75);

      // Replied: s-3 (REPLIED), s-4 (BOOKED) = 2 of 4 = 50%
      assert.equal(result.funnelStages[2].count, 2);
      assert.equal(result.funnelStages[2].pct, 50);

      // Booked: s-4 (BOOKED) = 1 of 4 = 25%
      assert.equal(result.funnelStages[3].count, 1);
      assert.equal(result.funnelStages[3].pct, 25);

      // Completed: 2 completed in period = 2 of 4 = 50%
      assert.equal(result.funnelStages[4].count, 2);
      assert.equal(result.funnelStages[4].pct, 50);
    });

    it('calculates ALL_TIME including all historical revenue', () => {
      const result = calculateResultsAnalytics({
        customers,
        services,
        serviceHistory,
        period: 'ALL_TIME',
        referenceDate: refDate,
      });

      // All 3 completed records: 1100 + 1300 + 2500 = 4900
      assert.equal(result.completedServicesCount, 3);
      assert.equal(result.confirmedRevenue, 4900);
      assert.equal(result.averageTicketSize, Math.round(4900 / 3));
    });
  });
});
