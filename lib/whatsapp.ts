import { WhatsAppTemplate } from './types';
import { formatReadableDate } from './due-date-engine';
import { getCategoryMetadata, normalizeCategory } from './catalog-presets';

export const SUPPORTED_PLACEHOLDERS = [
  '{{customer_name}}',
  '{{business_name}}',
  '{{service_name}}',
  '{{due_date}}',
  '{{business_phone}}',
  '{{phone}}',
  '{{asset_name}}',
  '{{booking_date}}',
  '{{next_due_date}}',
  '{{days_overdue}}',
] as const;

export type SupportedPlaceholder = (typeof SUPPORTED_PLACEHOLDERS)[number];

export interface PlaceholderMeta {
  tag: SupportedPlaceholder;
  label: string;
  description: string;
  sampleValue: string;
}

export const PLACEHOLDER_INFO: PlaceholderMeta[] = [
  {
    tag: '{{customer_name}}',
    label: 'Customer Name',
    description: 'Full name of the customer receiving the reminder.',
    sampleValue: 'Arun Kumar',
  },
  {
    tag: '{{business_name}}',
    label: 'Business Name',
    description: 'Your registered business or company name.',
    sampleValue: 'Apex Service Care',
  },
  {
    tag: '{{service_name}}',
    label: 'Service Name',
    description: 'Name of the scheduled maintenance or repair service.',
    sampleValue: 'Periodic Maintenance Service',
  },
  {
    tag: '{{due_date}}',
    label: 'Due Date',
    description: 'Formatted scheduled service due date.',
    sampleValue: '28 Oct 2026',
  },
  {
    tag: '{{business_phone}}',
    label: 'Business Phone',
    description: 'Your business contact phone number for customer callbacks.',
    sampleValue: '+91 98471 23456',
  },
  {
    tag: '{{phone}}',
    label: 'Phone (Alias)',
    description: 'Alias for your business contact phone number.',
    sampleValue: '+91 98471 23456',
  },
  {
    tag: '{{asset_name}}',
    label: 'Equipment / Asset',
    description: 'Customer appliance, vehicle, premises, or equipment description.',
    sampleValue: 'Primary Equipment / Asset',
  },
  {
    tag: '{{booking_date}}',
    label: 'Booking Date',
    description: 'Confirmed date for technician visit or appointment.',
    sampleValue: '26 Oct 2026',
  },
  {
    tag: '{{next_due_date}}',
    label: 'Next Cycle Date',
    description: 'Calculated next service date after service completion.',
    sampleValue: '28 Apr 2027',
  },
  {
    tag: '{{days_overdue}}',
    label: 'Days Overdue',
    description: 'Number of days elapsed since the scheduled due date.',
    sampleValue: '5',
  },
];

export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl-overdue',
    type: 'OVERDUE',
    name: 'Overdue Service Notice',
    templateText: `Hello {{customer_name}}, this is {{business_name}}.

Your {{service_name}} for {{asset_name}} is overdue by {{days_overdue}} days (scheduled for {{due_date}}).

Timely periodic servicing keeps everything running smoothly and prevents unexpected breakdowns.

Would you like us to schedule a service visit this week? Reply with a time that works best for you!`,
  },
  {
    id: 'tpl-due-soon',
    type: 'DUE_SOON',
    name: 'Due Soon (This Week)',
    templateText: `Hi {{customer_name}}, greetings from {{business_name}}!

Your scheduled {{service_name}} for {{asset_name}} is due on {{due_date}}.

Would you like us to reserve a convenient slot for you this week? Reply with your preferred date and time.`,
  },
  {
    id: 'tpl-due-today',
    type: 'DUE_TODAY',
    name: 'Due Today Follow-up',
    templateText: `Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today.

We have service slots available today and tomorrow. Shall we confirm an appointment for you?`,
  },
  {
    id: 'tpl-booking',
    type: 'BOOKING_CONFIRMATION',
    name: 'Booking Confirmation',
    templateText: `Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}.

Our technician will arrive as scheduled. If you need to reschedule, please reply to this message or call {{business_phone}}. Thank you!`,
  },
  {
    id: 'tpl-completed',
    type: 'SERVICE_COMPLETED',
    name: 'Service Completed & Next Cycle',
    templateText: `Thank you {{customer_name}} for choosing {{business_name}}!

Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}. We will remind you when it's time so you never have to worry about maintenance.`,
  },
];

export interface TemplateVariables {
  customer_name?: string | null;
  service_name?: string | null;
  asset_name?: string | null;
  due_date?: string | null;
  business_name?: string | null;
  business_phone?: string | null;
  phone?: string | null;
  booking_date?: string | null;
  next_due_date?: string | null;
  days_overdue?: number | string | null;
}

// Backward-compatibility alias
export type MessageVariables = TemplateVariables;

export interface InterpolationOptions {
  /**
   * If true (default), unresolvable placeholders like {{unknown}}
   * are cleanly removed so raw syntax does not leak to customers.
   * If false (useful in the editor), unknown placeholders are retained.
   */
  stripUnresolvedTags?: boolean;
  /**
   * Industry / category key or name for choosing sensible equipment fallbacks.
   */
  category?: string | null;
}

export interface TemplateValidationResult {
  isValid: boolean;
  usedTags: string[];
  unknownTags: string[];
  hasUnclosedTags: boolean;
  warnings: string[];
}

/**
 * Validates template syntax and placeholder tags.
 */
export function validateTemplate(template: string): TemplateValidationResult {
  if (!template || !template.trim()) {
    return {
      isValid: false,
      usedTags: [],
      unknownTags: [],
      hasUnclosedTags: false,
      warnings: ['Message template cannot be empty.'],
    };
  }

  const usedTags: string[] = [];
  const unknownTags: string[] = [];
  const warnings: string[] = [];

  const openCount = (template.match(/\{\{/g) || []).length;
  const closeCount = (template.match(/\}\}/g) || []).length;
  const hasUnclosedTags = openCount !== closeCount;
  if (hasUnclosedTags) {
    warnings.push('Unbalanced template placeholder braces {{ }} found.');
  }

  const validSet = new Set(SUPPORTED_PLACEHOLDERS.map((p) => p.toLowerCase()));
  const tagMatches = template.match(/\{\{([^}]+)\}\}/g) || [];

  for (const match of tagMatches) {
    const normalized = match.toLowerCase().trim();
    if (validSet.has(normalized as any)) {
      if (!usedTags.includes(normalized)) {
        usedTags.push(normalized);
      }
    } else {
      if (!unknownTags.includes(match)) {
        unknownTags.push(match);
        warnings.push(`Unknown placeholder "${match}" is not recognized and will be omitted in messages.`);
      }
    }
  }

  return {
    isValid: unknownTags.length === 0 && !hasUnclosedTags,
    usedTags,
    unknownTags,
    hasUnclosedTags,
    warnings,
  };
}

/**
 * Sanitizes phone numbers for wa.me link.
 * Handles Indian numbers (10 digits -> 91XXXXXXXXXX), +91 prefixes, leading zeroes.
 */
export function sanitizeWhatsAppPhone(phone: string | number): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Replaces {{variable}} placeholders with actual customer/business values.
 * Never outputs 'undefined', 'null', or empty placeholder syntax in customer messages.
 * Preserves Unicode and Malayalam text intact.
 */
export function interpolateTemplate(
  template: string,
  vars: TemplateVariables = {},
  options?: InterpolationOptions
): string {
  if (!template) return '';

  const category = options?.category;
  const meta = category ? getCategoryMetadata(category) : null;
  const defaultAssetLabel = meta ? meta.assetLabel : 'Equipment / Asset';

  const customerName = vars.customer_name?.trim() || 'Customer';
  const businessName = vars.business_name?.trim() || 'Our Service Team';
  const serviceName = vars.service_name?.trim() || 'Maintenance Service';
  const rawDueDate = vars.due_date?.trim();
  const dueDate = rawDueDate ? formatReadableDate(rawDueDate) : 'soon';
  const phone = vars.business_phone?.trim() || vars.phone?.trim() || '';
  const assetName = vars.asset_name?.trim() || defaultAssetLabel;
  const bookingDate = vars.booking_date ? formatReadableDate(vars.booking_date.trim()) : 'your scheduled date';
  const nextDueDate = vars.next_due_date ? formatReadableDate(vars.next_due_date.trim()) : 'your next scheduled date';

  // Calculate days overdue
  let daysOverdue = '';
  if (vars.days_overdue !== undefined && vars.days_overdue !== null && String(vars.days_overdue).trim() !== '') {
    daysOverdue = String(vars.days_overdue);
  } else if (rawDueDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)) {
    const [y, m, d] = rawDueDate.split('-').map(Number);
    const dueUtc = Date.UTC(y, m - 1, d);
    const now = new Date();
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((nowUtc - dueUtc) / (1000 * 60 * 60 * 24));
    daysOverdue = diff > 0 ? String(diff) : '0';
  } else {
    daysOverdue = 'a few';
  }

  let result = template
    .replace(/\{\{customer_name\}\}/gi, customerName)
    .replace(/\{\{business_name\}\}/gi, businessName)
    .replace(/\{\{service_name\}\}/gi, serviceName)
    .replace(/\{\{due_date\}\}/gi, dueDate)
    .replace(/\{\{business_phone\}\}/gi, phone)
    .replace(/\{\{phone\}\}/gi, phone)
    .replace(/\{\{asset_name\}\}/gi, assetName)
    .replace(/\{\{booking_date\}\}/gi, bookingDate)
    .replace(/\{\{next_due_date\}\}/gi, nextDueDate)
    .replace(/\{\{days_overdue\}\}/gi, daysOverdue);

  if (options?.stripUnresolvedTags !== false) {
    result = result.replace(/\{\{[^}]+\}\}/g, '').replace(/[ ]{2,}/g, ' ');
  }

  return result;
}

/**
 * Generates direct wa.me link with URL encoded message.
 * Correctly encodes emojis, Malayalam characters, and line breaks.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export interface CategorySampleData {
  customer_name: string;
  phone: string;
  asset_name: string;
  service_name: string;
  due_date: string;
  booking_date: string;
  next_due_date: string;
  days_overdue: string;
}

/**
 * Returns realistic category-specific sample data for dynamic preview.
 */
export function getCategorySampleData(category?: string | null): CategorySampleData {
  const norm = normalizeCategory(category);
  switch (norm) {
    case 'vehicle':
      return {
        customer_name: 'Arun Kumar',
        phone: '+91 98471 23456',
        asset_name: 'Hyundai Creta (KL-07-CD-1234)',
        service_name: 'Periodic Vehicle Maintenance',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '4',
      };
    case 'pest_control':
      return {
        customer_name: 'Suresh Nair',
        phone: '+91 98472 34567',
        asset_name: '3BHK Apartment (1,500 sq ft)',
        service_name: 'General Pest Control Treatment',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Jan 2027',
        days_overdue: '3',
      };
    case 'water_purifier':
      return {
        customer_name: 'Priya Menon',
        phone: '+91 98473 45678',
        asset_name: 'Kent Grand+ RO (8L)',
        service_name: 'Periodic Filter Replacement',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '5',
      };
    case 'appliance':
      return {
        customer_name: 'Deepa Thomas',
        phone: '+91 98474 56789',
        asset_name: 'LG Front Load Washing Machine',
        service_name: 'Washing Machine Descaling & Tub Clean',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '2',
      };
    case 'cleaning':
      return {
        customer_name: 'Rajan Pillai',
        phone: '+91 98475 67890',
        asset_name: 'Duplex Villa (2,500 sq ft)',
        service_name: 'Full Home Deep Wash & Sanitization',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '6',
      };
    case 'solar':
      return {
        customer_name: 'Mathew Joseph',
        phone: '+91 98476 78901',
        asset_name: '5kW Rooftop Solar Array',
        service_name: 'Solar Panel Array Deep Clean',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Jan 2027',
        days_overdue: '5',
      };
    case 'electrical_plumbing':
      return {
        customer_name: 'Anil Kumar',
        phone: '+91 98477 89012',
        asset_name: 'Residential Wiring & Piping',
        service_name: 'Annual Electrical Safety Inspection',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Oct 2027',
        days_overdue: '7',
      };
    case 'ac':
      return {
        customer_name: 'Arun Kumar',
        phone: '+91 98471 23456',
        asset_name: 'Daikin 1.5 Ton Split AC',
        service_name: 'AC Periodic General Service',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '5',
      };
    case 'other':
    default:
      return {
        customer_name: 'Kavitha R.',
        phone: '+91 98478 90123',
        asset_name: 'Client Equipment / Asset',
        service_name: 'Periodic Routine Service',
        due_date: '28 Oct 2026',
        booking_date: '26 Oct 2026',
        next_due_date: '28 Apr 2027',
        days_overdue: '3',
      };
  }
}
