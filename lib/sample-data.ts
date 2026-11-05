import { getCategoryMetadata } from './catalog-presets';

export const SAMPLE_TAG = '[Sample Data]';

export interface SampleClientSeed {
  name: string;
  phone: string;
  address: string;
  locality: string;
  city: string;
  assetName: string;
  serviceName: string;
  serviceAmount: number;
  lastServiceDate: string;
  nextDueDate: string;
  notes: string;
}

/**
 * Generates 3 realistic sample customers tailored to the business category.
 * Dates are calculated so one is OVERDUE, one is DUE_TODAY, and one is DUE_THIS_WEEK.
 */
export function generateSampleClients(category: string): SampleClientSeed[] {
  const meta = getCategoryMetadata(category);
  const now = new Date();

  // Helper date strings (YYYY-MM-DD)
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Overdue date (-14 days)
  const overdueDate = new Date(now);
  overdueDate.setDate(now.getDate() - 14);

  // Due today
  const todayDate = new Date(now);

  // Due in 3 days (due this week)
  const thisWeekDate = new Date(now);
  thisWeekDate.setDate(now.getDate() + 3);

  // Last service 6 months ago
  const lastService = new Date(now);
  lastService.setMonth(now.getMonth() - 6);
  const lastServiceStr = toDateStr(lastService);

  const primaryService = meta.services?.[0]?.name || 'Standard Maintenance';
  const primaryAmount = meta.services?.[0]?.typicalPrice || 1200;
  const secondaryService = meta.services?.[1]?.name || primaryService;
  const secondaryAmount = meta.services?.[1]?.typicalPrice || 1800;

  return [
    {
      name: `Kavitha Nair ${SAMPLE_TAG}`,
      phone: '9846011221',
      address: `Flat 4B, Olive Heights, Panampilly Nagar ${SAMPLE_TAG}`,
      locality: 'Panampilly Nagar',
      city: 'Kochi',
      assetName: `Master Bedroom ${meta.assetLabel}`,
      serviceName: primaryService,
      serviceAmount: primaryAmount,
      lastServiceDate: lastServiceStr,
      nextDueDate: toDateStr(overdueDate),
      notes: SAMPLE_TAG,
    },
    {
      name: `Dr. Rahul Sharma ${SAMPLE_TAG}`,
      phone: '9846022332',
      address: `Villa 12, Skyline Meadows, Kakkanad ${SAMPLE_TAG}`,
      locality: 'Kakkanad',
      city: 'Kochi',
      assetName: `Living Room ${meta.assetLabel}`,
      serviceName: secondaryService,
      serviceAmount: secondaryAmount,
      lastServiceDate: lastServiceStr,
      nextDueDate: toDateStr(todayDate),
      notes: SAMPLE_TAG,
    },
    {
      name: `Anand Joseph ${SAMPLE_TAG}`,
      phone: '9846033443',
      address: `Door 32/110, Marine Drive ${SAMPLE_TAG}`,
      locality: 'Marine Drive',
      city: 'Kochi',
      assetName: `Office Unit ${meta.assetLabel}`,
      serviceName: primaryService,
      serviceAmount: primaryAmount,
      lastServiceDate: lastServiceStr,
      nextDueDate: toDateStr(thisWeekDate),
      notes: SAMPLE_TAG,
    },
  ];
}

/**
 * Checks whether a customer record is sample data.
 */
export function isSampleCustomer(customer: { name?: string; address?: string; notes?: string }): boolean {
  if (!customer) return false;
  const tag = SAMPLE_TAG.toLowerCase();
  return Boolean(
    (customer.name && customer.name.toLowerCase().includes(tag)) ||
    (customer.address && customer.address.toLowerCase().includes(tag)) ||
    (customer.notes && customer.notes.toLowerCase().includes(tag))
  );
}

/**
 * Counts how many customers in the list are sample data.
 */
export function getSampleCustomerCount(customers: Array<{ name?: string; address?: string; notes?: string }>): number {
  return customers.filter(isSampleCustomer).length;
}
