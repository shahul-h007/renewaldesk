import { WhatsAppTemplate } from './types';

export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl-overdue',
    type: 'OVERDUE',
    name: 'Overdue Service Notice',
    templateText: `Hi {{customer_name}}, this is {{business_name}}.

Your {{service_name}} for your {{asset_name}} is overdue (scheduled for {{due_date}}).

Regular periodic servicing prevents compressor breakdown and high electricity bills.

Would you like us to schedule our technician to visit your home this week? Let us know what time works best for you!`,
  },
  {
    id: 'tpl-due-soon',
    type: 'DUE_SOON',
    name: 'Due Soon (This Week)',
    templateText: `Hi {{customer_name}}, greetings from {{business_name}}!

Your {{service_name}} for your {{asset_name}} is due this week on {{due_date}}.

Would you like us to reserve a convenient slot for you? Reply with your preferred date and time.`,
  },
  {
    id: 'tpl-due-today',
    type: 'DUE_TODAY',
    name: 'Due Today Follow-up',
    templateText: `Good morning {{customer_name}}, {{business_name}} here.

Your scheduled {{service_name}} is due today! We have technicians available in your area today.

Shall we confirm an appointment for today or tomorrow?`,
  },
  {
    id: 'tpl-booking',
    type: 'BOOKING_CONFIRMATION',
    name: 'Booking Confirmation',
    templateText: `Hi {{customer_name}}, your service booking for {{asset_name}} has been confirmed with {{business_name}}.

Our technician will arrive as scheduled. If you need to reschedule, please reply to this message or call {{phone}}. Thank you!`,
  },
  {
    id: 'tpl-completed',
    type: 'SERVICE_COMPLETED',
    name: 'Service Completed & Next Cycle',
    templateText: `Thank you {{customer_name}} for choosing {{business_name}}!

Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{due_date}}. We will remind you when it's time so you never have to worry about maintenance.`,
  },
];

export interface MessageVariables {
  customer_name: string;
  service_name: string;
  asset_name: string;
  due_date: string;
  business_name: string;
  phone: string;
}

/**
 * Sanitizes phone numbers for wa.me link.
 * Handles Indian numbers (10 digits -> 91XXXXXXXXXX)
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Replaces {{variable}} placeholders with actual customer/business values.
 */
export function interpolateTemplate(template: string, vars: MessageVariables): string {
  let result = template;
  result = result.replace(/{{customer_name}}/g, vars.customer_name || 'Customer');
  result = result.replace(/{{service_name}}/g, vars.service_name || 'Maintenance Service');
  result = result.replace(/{{asset_name}}/g, vars.asset_name || 'Appliance');
  result = result.replace(/{{due_date}}/g, vars.due_date || 'soon');
  result = result.replace(/{{business_name}}/g, vars.business_name || 'Our Service Team');
  result = result.replace(/{{phone}}/g, vars.phone || '');
  return result;
}

/**
 * Generates direct wa.me link with URL encoded message.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
