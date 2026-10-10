import { Customer, Asset, ServiceRecord, ServiceCatalogItem, WhatsAppTemplate, BusinessProfile, FollowUpStatus, IntervalUnit } from '../types';

export interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBusiness {
  id: string;
  name: string;
  slug: string | null;
  business_type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  default_interval_months: number;
  created_at: string;
  updated_at: string;
}

export interface DbCustomer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  locality: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface DbAsset {
  id: string;
  business_id: string;
  customer_id: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  capacity: string | null;
  location: string | null;
  serial_number: string | null;
  installation_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbServiceType {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  interval_value: number;
  interval_unit: IntervalUnit;
  typical_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbServiceRecord {
  id: string;
  business_id: string;
  customer_id: string;
  asset_id: string | null;
  service_type_id: string | null;
  service_name: string;
  service_date: string;
  fee_charged: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DbServiceSchedule {
  id: string;
  business_id: string;
  customer_id: string;
  asset_id: string | null;
  service_type_id: string | null;
  service_name: string;
  last_service_date: string | null;
  next_due_date: string;
  interval_value: number;
  interval_unit: IntervalUnit;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface DbReminder {
  id: string;
  business_id: string;
  customer_id: string;
  schedule_id: string | null;
  due_date: string;
  status: FollowUpStatus;
  contacted_at: string | null;
  booked_at: string | null;
  completed_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessageTemplate {
  id: string;
  business_id: string;
  name: string;
  template_type: 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'BOOKING_CONFIRMATION' | 'SERVICE_COMPLETED';
  message_body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  business_id: string;
  actor_user_id: string | null;
  customer_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}
