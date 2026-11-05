import { Customer, ServiceRecord, CompletedServiceRecord } from './types';

export type AnalyticsPeriod = 'ALL_TIME' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_QUARTER';

export interface DateRangeBounds {
  period: AnalyticsPeriod;
  startDate: string | null; // YYYY-MM-DD inclusive or null for ALL_TIME
  endDate: string | null;   // YYYY-MM-DD inclusive or null for ALL_TIME
  label: string;
}

export interface FunnelStageMetric {
  key: string;
  stageNumber: number;
  label: string;
  count: number;
  pct: number;
  barWidthPct: number;
  color: string;
  description: string;
  numerator: number;
  denominator: number;
  formulaDescription: string;
}

export interface ResultsAnalytics {
  bounds: DateRangeBounds;
  referenceDate: string;

  // Customer & schedule counts
  totalCustomers: number;
  customersWithActiveCycles: number;
  activeCycleCoveragePct: number;

  schedulesDueInPeriodCount: number;
  customersDueInPeriodCount: number;

  overdueSchedulesInPeriodCount: number;
  overdueCustomersInPeriodCount: number;

  upcomingSchedulesInPeriodCount: number;
  upcomingCustomersInPeriodCount: number;

  schedulesWithInvalidDueDateCount: number;
  customersWithInvalidDueDateCount: number;

  completedServicesCount: number;
  completedCustomersCount: number;

  // Revenue metrics
  confirmedRevenue: number;
  averageTicketSize: number;
  projectedDuePipeline: number;

  // 5-Stage Funnel
  funnelStages: FunnelStageMetric[];

  // Completed records in period
  completedRecordsInPeriod: CompletedServiceRecord[];
}

export interface AnalyticsInput {
  customers: Customer[];
  services: ServiceRecord[];
  serviceHistory: CompletedServiceRecord[];
  period?: AnalyticsPeriod;
  referenceDate?: string;
}

export function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidIsoDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  const ts = Date.parse(trimmed.slice(0, 10));
  return !isNaN(ts);
}

export function getDateRangeBounds(
  period: AnalyticsPeriod = 'ALL_TIME',
  referenceDateStr?: string
): DateRangeBounds {
  const ref = referenceDateStr && isValidIsoDate(referenceDateStr)
    ? new Date(referenceDateStr.slice(0, 10) + 'T00:00:00')
    : new Date();

  const refY = ref.getFullYear();
  const refM = ref.getMonth();

  switch (period) {
    case 'THIS_MONTH': {
      const startDate = `${refY}-${String(refM + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(refY, refM + 1, 0).getDate();
      const endDate = `${refY}-${String(refM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        period,
        startDate,
        endDate,
        label: 'This Month',
      };
    }
    case 'LAST_30_DAYS': {
      const endDate = formatDateYMD(ref);
      const past = new Date(ref);
      past.setDate(past.getDate() - 29);
      const startDate = formatDateYMD(past);
      return {
        period,
        startDate,
        endDate,
        label: 'Last 30 Days',
      };
    }
    case 'THIS_QUARTER': {
      const qIndex = Math.floor(refM / 3);
      const startM = qIndex * 3;
      const endM = startM + 2;
      const startDate = `${refY}-${String(startM + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(refY, endM + 1, 0).getDate();
      const endDate = `${refY}-${String(endM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        period,
        startDate,
        endDate,
        label: `Q${qIndex + 1} ${refY} (This Quarter)`,
      };
    }
    case 'ALL_TIME':
    default:
      return {
        period: 'ALL_TIME',
        startDate: null,
        endDate: null,
        label: 'All Time',
      };
  }
}

export function isDateInRange(
  dateStr: string | null | undefined,
  bounds: DateRangeBounds
): boolean {
  if (!isValidIsoDate(dateStr)) return false;
  const norm = (dateStr as string).trim().slice(0, 10);
  if (bounds.startDate && norm < bounds.startDate) return false;
  if (bounds.endDate && norm > bounds.endDate) return false;
  return true;
}

export function calculateResultsAnalytics(input: AnalyticsInput): ResultsAnalytics {
  const { customers = [], services = [], serviceHistory = [], period = 'ALL_TIME', referenceDate } = input;

  const bounds = getDateRangeBounds(period, referenceDate);
  const todayStr = referenceDate && isValidIsoDate(referenceDate)
    ? referenceDate.trim().slice(0, 10)
    : formatDateYMD(new Date());

  const totalCustomers = customers.length;

  // Track invalid due dates explicitly
  const invalidSchedules = services.filter((s) => !isValidIsoDate(s.nextDueDate));
  const schedulesWithInvalidDueDateCount = invalidSchedules.length;
  const customersWithInvalidDueDateCount = new Set(invalidSchedules.map((s) => s.customerId)).size;

  // Active service schedules with valid due dates
  const validSchedules = services.filter((s) => isValidIsoDate(s.nextDueDate));
  const customersWithActiveCycles = new Set(services.map((s) => s.customerId)).size;
  const activeCycleCoveragePct =
    totalCustomers > 0 ? Math.round((customersWithActiveCycles / totalCustomers) * 100) : 0;

  // Schedules due in selected period
  const schedulesDueInPeriod = validSchedules.filter((s) => isDateInRange(s.nextDueDate, bounds));
  const schedulesDueInPeriodCount = schedulesDueInPeriod.length;
  const customersDueInPeriodCount = new Set(schedulesDueInPeriod.map((s) => s.customerId)).size;

  // Overdue schedules in period (nextDueDate < todayStr AND not completed)
  const overdueSchedulesInPeriod = schedulesDueInPeriod.filter(
    (s) => s.nextDueDate.slice(0, 10) < todayStr && s.followUpStatus !== 'COMPLETED'
  );
  const overdueSchedulesInPeriodCount = overdueSchedulesInPeriod.length;
  const overdueCustomersInPeriodCount = new Set(overdueSchedulesInPeriod.map((s) => s.customerId)).size;

  // Upcoming schedules in period (nextDueDate >= todayStr)
  const upcomingSchedulesInPeriod = schedulesDueInPeriod.filter(
    (s) => s.nextDueDate.slice(0, 10) >= todayStr
  );
  const upcomingSchedulesInPeriodCount = upcomingSchedulesInPeriod.length;
  const upcomingCustomersInPeriodCount = new Set(upcomingSchedulesInPeriod.map((s) => s.customerId)).size;

  // Completed services during the selected period from historical records
  const completedRecordsInPeriod = serviceHistory.filter((r) => isDateInRange(r.serviceDate, bounds));
  const completedServicesCount = completedRecordsInPeriod.length;
  const completedCustomersCount = new Set(completedRecordsInPeriod.map((r) => r.customerId)).size;

  // Confirmed Revenue: sum of feeCharged from actual completed records
  const confirmedRevenue = completedRecordsInPeriod.reduce((sum, r) => sum + (Number(r.feeCharged) || 0), 0);
  const averageTicketSize = completedServicesCount > 0 ? Math.round(confirmedRevenue / completedServicesCount) : 0;

  // Projected Due Pipeline: sum of serviceAmount for schedules due in the period
  const projectedDuePipeline = schedulesDueInPeriod.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0);

  // 5-Stage Customer Recovery Funnel (truthful, division-by-zero protected)
  const denominator = schedulesDueInPeriodCount;

  const contactedSchedules = schedulesDueInPeriod.filter((s) =>
    ['CONTACTED', 'REPLIED', 'BOOKED', 'COMPLETED'].includes(s.followUpStatus)
  );
  const repliedSchedules = schedulesDueInPeriod.filter((s) =>
    ['REPLIED', 'BOOKED', 'COMPLETED'].includes(s.followUpStatus)
  );
  const bookedSchedules = schedulesDueInPeriod.filter((s) =>
    ['BOOKED', 'COMPLETED'].includes(s.followUpStatus)
  );

  const contactedCount = contactedSchedules.length;
  const repliedCount = repliedSchedules.length;
  const bookedCount = bookedSchedules.length;

  const calcPct = (num: number, den: number): number => {
    if (den <= 0) return 0;
    return Math.round((num / den) * 100);
  };

  const funnelStages: FunnelStageMetric[] = [
    {
      key: 'due',
      stageNumber: 1,
      label: '1. Services Due',
      count: schedulesDueInPeriodCount,
      pct: denominator > 0 ? 100 : 0,
      barWidthPct: denominator > 0 ? 100 : 0,
      color: 'bg-blue-600',
      description: 'Recurring service schedules falling due in this period',
      numerator: schedulesDueInPeriodCount,
      denominator,
      formulaDescription:
        denominator > 0
          ? `${schedulesDueInPeriodCount} due / ${denominator} (${customersDueInPeriodCount} distinct customers)`
          : '0 due in selected period',
    },
    {
      key: 'contacted',
      stageNumber: 2,
      label: '2. Contacted on WhatsApp',
      count: contactedCount,
      pct: calcPct(contactedCount, denominator),
      barWidthPct: Math.min(100, calcPct(contactedCount, denominator)),
      color: 'bg-emerald-500',
      description: 'WhatsApp reminders sent to customers',
      numerator: contactedCount,
      denominator,
      formulaDescription:
        denominator > 0 ? `${contactedCount} of ${denominator} contacted` : 'No due services to contact',
    },
    {
      key: 'replied',
      stageNumber: 3,
      label: '3. Customer Replied',
      count: repliedCount,
      pct: calcPct(repliedCount, denominator),
      barWidthPct: Math.min(100, calcPct(repliedCount, denominator)),
      color: 'bg-purple-500',
      description: 'Customers who responded or requested time',
      numerator: repliedCount,
      denominator,
      formulaDescription:
        denominator > 0 ? `${repliedCount} of ${denominator} replied` : 'No responses in period',
    },
    {
      key: 'booked',
      stageNumber: 4,
      label: '4. Service Booked',
      count: bookedCount,
      pct: calcPct(bookedCount, denominator),
      barWidthPct: Math.min(100, calcPct(bookedCount, denominator)),
      color: 'bg-indigo-500',
      description: 'Confirmed technician appointments scheduled',
      numerator: bookedCount,
      denominator,
      formulaDescription:
        denominator > 0 ? `${bookedCount} of ${denominator} booked` : 'No bookings in period',
    },
    {
      key: 'completed',
      stageNumber: 5,
      label: '5. Completed & Paid',
      count: completedServicesCount,
      pct: calcPct(completedServicesCount, denominator),
      barWidthPct: Math.min(100, calcPct(completedServicesCount, denominator)),
      color: 'bg-green-600',
      description: 'Services completed and fees recovered',
      numerator: completedServicesCount,
      denominator,
      formulaDescription:
        denominator > 0
          ? `${completedServicesCount} completed vs ${denominator} due`
          : `${completedServicesCount} completed (0 due scheduled)`,
    },
  ];

  return {
    bounds,
    referenceDate: todayStr,
    totalCustomers,
    customersWithActiveCycles,
    activeCycleCoveragePct,
    schedulesDueInPeriodCount,
    customersDueInPeriodCount,
    overdueSchedulesInPeriodCount,
    overdueCustomersInPeriodCount,
    upcomingSchedulesInPeriodCount,
    upcomingCustomersInPeriodCount,
    schedulesWithInvalidDueDateCount,
    customersWithInvalidDueDateCount,
    completedServicesCount,
    completedCustomersCount,
    confirmedRevenue,
    averageTicketSize,
    projectedDuePipeline,
    funnelStages,
    completedRecordsInPeriod,
  };
}
