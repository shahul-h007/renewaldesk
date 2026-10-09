export type ServiceUrgency = 'OVERDUE' | 'DUE_TODAY' | 'DUE_THIS_WEEK' | 'DUE_THIS_MONTH' | 'FUTURE';

export type FollowUpStatus =
  | 'NOT_CONTACTED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'BOOKED'
  | 'COMPLETED'
  | 'NOT_INTERESTED'
  | 'NO_RESPONSE';

export interface Asset {
  id: string;
  customerId: string;
  name: string; // e.g. "Samsung Inverter Split AC"
  model?: string; // e.g. "AR18CY3ZAPG"
  capacity?: string; // e.g. "1.5 Ton"
  location?: string; // e.g. "Master Bedroom"
  installDate?: string;
  notes?: string;
}

export interface ServiceRecord {
  id: string;
  customerId: string;
  assetId: string;
  serviceName: string; // e.g. "AC General Maintenance"
  lastServiceDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  intervalMonths: number; // e.g. 6
  intervalValue?: number;
  intervalUnit?: IntervalUnit;
  serviceAmount: number; // in INR ₹ e.g. 1200
  urgency: ServiceUrgency;
  followUpStatus: FollowUpStatus;
  lastContactedAt?: string;
  bookingDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  locality?: string; // e.g. "Edappally, Kochi"
  notes?: string;
  createdAt: string;
}

export type IntervalUnit = 'DAYS' | 'MONTHS' | 'YEARS';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  defaultIntervalMonths: number;
  typicalPrice: number;
  isActive: boolean;
}

export interface WhatsAppTemplate {
  id: string;
  type: 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'BOOKING_CONFIRMATION' | 'SERVICE_COMPLETED';
  name: string;
  templateText: string;
}

export interface BusinessProfile {
  name: string;
  phone: string;
  industry: string;
  city: string;
  currency: string;
  defaultIntervalMonths: number;
}
