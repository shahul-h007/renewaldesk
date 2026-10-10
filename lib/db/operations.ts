import { createClient } from '../supabase/client';
import { Customer, Asset, ServiceRecord, ServiceCatalogItem, WhatsAppTemplate, BusinessProfile, FollowUpStatus, IntervalUnit } from '../types';
import { calculateDueStatus, calculateNextDueDate } from '../due-date-engine';
import { DbCustomer, DbAsset, DbServiceType, DbServiceSchedule, DbReminder, DbMessageTemplate, DbBusiness } from './types';

/**
 * Fetch all operational data for a given business from Supabase.
 */
export async function fetchBusinessData(businessId: string) {
  const supabase = createClient();

  const [
    custRes,
    assetRes,
    typeRes,
    schedRes,
    remindRes,
    tplRes,
    bizRes,
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('business_id', businessId).is('archived_at', null).order('created_at', { ascending: false }),
    supabase.from('assets').select('*').eq('business_id', businessId),
    supabase.from('service_types').select('*').eq('business_id', businessId).order('created_at', { ascending: true }),
    supabase.from('service_schedules').select('*').eq('business_id', businessId),
    supabase.from('reminders').select('*').eq('business_id', businessId),
    supabase.from('message_templates').select('*').eq('business_id', businessId),
    supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
  ]);

  if (custRes.error) throw custRes.error;
  if (assetRes.error) throw assetRes.error;
  if (typeRes.error) throw typeRes.error;
  if (schedRes.error) throw schedRes.error;
  if (remindRes.error) throw remindRes.error;
  if (tplRes.error) throw tplRes.error;

  const dbCustomers: DbCustomer[] = custRes.data || [];
  const dbAssets: DbAsset[] = assetRes.data || [];
  const dbTypes: DbServiceType[] = typeRes.data || [];
  const dbSchedules: DbServiceSchedule[] = schedRes.data || [];
  const dbReminders: DbReminder[] = remindRes.data || [];
  const dbTemplates: DbMessageTemplate[] = tplRes.data || [];
  const dbBiz: DbBusiness | null = bizRes.data;

  // Map to frontend Customer model
  const customers: Customer[] = dbCustomers.map(mapDbCustomerToApp);

  // Map to frontend Asset model
  const assets: Asset[] = dbAssets.map(mapDbAssetToApp);

  // Map to frontend Catalog model
  const catalog: ServiceCatalogItem[] = dbTypes.map(mapDbServiceTypeToApp);

  // Map to frontend ServiceRecord / Follow-up list
  const services: ServiceRecord[] = dbSchedules.map((s) => {
    const reminder = dbReminders.find((r) => r.schedule_id === s.id);
    return mapDbScheduleToApp(s, reminder, catalog);
  });

  // Map to frontend WhatsApp Templates
  const templates: WhatsAppTemplate[] = dbTemplates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    type: tpl.template_type,
    templateText: tpl.message_body,
  }));

  // Map to frontend Business profile
  const business: BusinessProfile = {
    name: dbBiz?.name || 'My Service Business',
    phone: dbBiz?.phone || '',
    industry: dbBiz?.business_type || 'Air Conditioning Maintenance',
    city: dbBiz?.address || 'Kochi',
    currency: dbBiz?.currency || '₹',
    defaultIntervalMonths: dbBiz?.default_interval_months || 6,
  };

  return {
    customers,
    assets,
    services,
    catalog,
    templates,
    business,
  };
}

/**
 * Add a new customer, their appliance asset, and initial service schedule in Supabase.
 */
export async function createCustomerInDb(
  businessId: string,
  custData: Omit<Customer, 'id' | 'createdAt'>,
  assetData: Omit<Asset, 'id' | 'customerId'>,
  serviceData: Omit<ServiceRecord, 'id' | 'customerId' | 'assetId' | 'urgency'>
) {
  const supabase = createClient();

  // 1. Insert customer
  const { data: customerRow, error: custErr } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      name: custData.name.trim(),
      phone: custData.phone.trim(),
      email: custData.email?.trim() || null,
      address: custData.address?.trim() || null,
      locality: custData.locality?.trim() || null,
    })
    .select()
    .single();

  if (custErr) throw custErr;

  // 2. Insert asset
  const { data: assetRow, error: assetErr } = await supabase
    .from('assets')
    .insert({
      business_id: businessId,
      customer_id: customerRow.id,
      asset_type: assetData.name || 'Air Conditioner',
      capacity: assetData.capacity || null,
      location: assetData.location || null,
    })
    .select()
    .single();

  if (assetErr) throw assetErr;

  // 3. Find service type if available
  const { data: serviceTypeRow } = await supabase
    .from('service_types')
    .select('id')
    .eq('business_id', businessId)
    .ilike('name', serviceData.serviceName.trim())
    .maybeSingle();

  // 4. Insert service schedule
  const { data: scheduleRow, error: schedErr } = await supabase
    .from('service_schedules')
    .insert({
      business_id: businessId,
      customer_id: customerRow.id,
      asset_id: assetRow.id,
      service_type_id: serviceTypeRow?.id || null,
      service_name: serviceData.serviceName,
      last_service_date: serviceData.lastServiceDate || null,
      next_due_date: serviceData.nextDueDate,
      interval_value: serviceData.intervalValue || serviceData.intervalMonths || 6,
      interval_unit: serviceData.intervalUnit || 'MONTHS',
      status: 'ACTIVE',
    })
    .select()
    .single();

  if (schedErr) throw schedErr;

  // 5. Insert initial reminder
  const { error: remindErr } = await supabase
    .from('reminders')
    .insert({
      business_id: businessId,
      customer_id: customerRow.id,
      schedule_id: scheduleRow.id,
      due_date: serviceData.nextDueDate,
      status: 'NOT_CONTACTED',
    });

  if (remindErr) throw remindErr;

  // 6. Log activity
  await supabase.from('activities').insert({
    business_id: businessId,
    customer_id: customerRow.id,
    action_type: 'CUSTOMER_CREATED',
    description: `Added customer ${customerRow.name} with ${scheduleRow.service_name} due on ${scheduleRow.next_due_date}`,
  });

  return { customerRow, assetRow, scheduleRow };
}

/**
 * Update customer details in the database.
 */
export async function updateCustomerInDb(businessId: string, customer: Customer) {
  const supabase = createClient();
  const { error } = await supabase
    .from('customers')
    .update({
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email?.trim() || null,
      address: customer.address?.trim() || null,
      locality: customer.locality?.trim() || null,
      notes: customer.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id)
    .eq('business_id', businessId);

  if (error) throw error;
}

/**
 * Archive (soft-delete) a customer and cancel their active schedules in the database.
 */
export async function archiveCustomerInDb(businessId: string, customerId: string) {
  const supabase = createClient();
  
  // 1. Mark customer as archived
  const { error: custErr } = await supabase
    .from('customers')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('business_id', businessId);

  if (custErr) throw custErr;

  // 2. Mark active schedules as cancelled
  await supabase
    .from('service_schedules')
    .update({
      status: 'CANCELLED',
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customerId)
    .eq('business_id', businessId);

  // 3. Log activity
  await supabase.from('activities').insert({
    business_id: businessId,
    customer_id: customerId,
    action_type: 'CUSTOMER_ARCHIVED',
    description: `Archived customer ${customerId}`,
  });
}

/**
 * Bulk import normalized customers, assets, and service schedules from CSV rows into the database.
 */
export async function importCustomersFromCSVInDb(businessId: string, validRows: any[]): Promise<number> {
  let importedCount = 0;
  for (const row of validRows) {
    const norm = row.normalized;
    if (!norm) continue;

    await createCustomerInDb(
      businessId,
      {
        name: norm.name,
        phone: norm.phone,
        address: norm.address || 'Kochi',
        locality: 'Kochi',
      },
      {
        name: norm.assetName || 'Air Conditioner',
      },
      {
        serviceName: 'AC Periodic General Service',
        lastServiceDate: norm.lastServiceDate || '',
        nextDueDate: norm.nextDueDate,
        intervalMonths: 6,
        serviceAmount: norm.serviceAmount || 1200,
        followUpStatus: 'NOT_CONTACTED',
      }
    );
    importedCount++;
  }
  return importedCount;
}

/**
 * Update follow-up status on a reminder/schedule.
 */
export async function updateFollowUpStatusInDb(
  businessId: string,
  scheduleId: string,
  status: FollowUpStatus
) {
  const supabase = createClient();

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'CONTACTED') {
    updates.contacted_at = new Date().toISOString();
  } else if (status === 'BOOKED') {
    updates.booked_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('business_id', businessId)
    .eq('schedule_id', scheduleId);

  if (error) throw error;
}

/**
 * Mark a service completed, record history, and push next due date forward.
 */
export async function markServiceCompletedInDb(
  businessId: string,
  scheduleId: string,
  completedDate: string,
  amountCollected: number,
  intervalVal: number,
  intervalUnit: IntervalUnit
) {
  const supabase = createClient();

  // 1. Fetch the schedule
  const { data: schedule, error: schedFetchErr } = await supabase
    .from('service_schedules')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', scheduleId)
    .single();

  if (schedFetchErr) throw schedFetchErr;

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(completedDate, intervalVal, intervalUnit);

  // 2. Insert service record
  const { error: recErr } = await supabase
    .from('service_records')
    .insert({
      business_id: businessId,
      customer_id: schedule.customer_id,
      asset_id: schedule.asset_id,
      service_type_id: schedule.service_type_id,
      service_name: schedule.service_name,
      service_date: completedDate,
      fee_charged: amountCollected,
      status: 'COMPLETED',
      notes: `Service marked complete. Fee collected: ${amountCollected}`,
    });

  if (recErr) throw recErr;

  // 3. Update the schedule with new due date
  const { error: schedUpdateErr } = await supabase
    .from('service_schedules')
    .update({
      last_service_date: completedDate,
      next_due_date: nextDueDate,
      interval_value: intervalVal,
      interval_unit: intervalUnit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);

  if (schedUpdateErr) throw schedUpdateErr;

  // 4. Update reminder
  const { error: remErr } = await supabase
    .from('reminders')
    .update({
      due_date: nextDueDate,
      status: 'NOT_CONTACTED',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('schedule_id', scheduleId);

  if (remErr) throw remErr;

  // 5. Log activity
  await supabase.from('activities').insert({
    business_id: businessId,
    customer_id: schedule.customer_id,
    action_type: 'SERVICE_COMPLETED',
    description: `Completed ${schedule.service_name} (₹${amountCollected}). Next due on ${nextDueDate}.`,
  });

  return { nextDueDate };
}

/**
 * Add a new service type to the database with duplicate name prevention.
 */
export async function addServiceTypeInDb(
  businessId: string,
  data: Omit<ServiceCatalogItem, 'id'>
) {
  const supabase = createClient();
  const trimmedName = data.name.trim();

  // Duplicate check
  const { data: existing } = await supabase
    .from('service_types')
    .select('id')
    .eq('business_id', businessId)
    .ilike('name', trimmedName)
    .maybeSingle();

  if (existing) {
    throw new Error(`A service type named "${trimmedName}" already exists.`);
  }

  const { data: created, error } = await supabase
    .from('service_types')
    .insert({
      business_id: businessId,
      name: trimmedName,
      description: data.description?.trim() || null,
      interval_value: data.intervalValue,
      interval_unit: data.intervalUnit,
      typical_fee: data.typicalPrice,
      is_active: data.isActive,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: created.id,
    name: created.name,
    description: created.description || undefined,
    intervalValue: created.interval_value,
    intervalUnit: created.interval_unit,
    defaultIntervalMonths: created.interval_unit === 'YEARS' ? created.interval_value * 12 : (created.interval_unit === 'DAYS' ? Math.max(1, Math.round(created.interval_value / 30)) : created.interval_value),
    typicalPrice: Number(created.typical_fee),
    isActive: created.is_active,
  };
}

/**
 * Update an existing service type in the database.
 */
export async function updateServiceTypeInDb(
  businessId: string,
  updatedItem: ServiceCatalogItem,
  updateExistingSchedules = false
) {
  const supabase = createClient();
  const trimmedName = updatedItem.name.trim();

  // Check duplicate
  const { data: existing } = await supabase
    .from('service_types')
    .select('id')
    .eq('business_id', businessId)
    .neq('id', updatedItem.id)
    .ilike('name', trimmedName)
    .maybeSingle();

  if (existing) {
    throw new Error(`Another service type named "${trimmedName}" already exists.`);
  }

  const { error } = await supabase
    .from('service_types')
    .update({
      name: trimmedName,
      description: updatedItem.description?.trim() || null,
      interval_value: updatedItem.intervalValue,
      interval_unit: updatedItem.intervalUnit,
      typical_fee: updatedItem.typicalPrice,
      is_active: updatedItem.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', updatedItem.id)
    .eq('business_id', businessId);

  if (error) throw error;

  // Optional: Update existing upcoming schedules if explicitly opted in
  if (updateExistingSchedules) {
    const { data: schedules } = await supabase
      .from('service_schedules')
      .select('id, last_service_date')
      .eq('business_id', businessId)
      .eq('service_type_id', updatedItem.id)
      .eq('status', 'ACTIVE');

    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        const baseDate = s.last_service_date || new Date().toISOString().split('T')[0];
        const newDue = calculateNextDueDate(baseDate, updatedItem.intervalValue, updatedItem.intervalUnit);
        await supabase
          .from('service_schedules')
          .update({
            next_due_date: newDue,
            interval_value: updatedItem.intervalValue,
            interval_unit: updatedItem.intervalUnit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', s.id);

        await supabase
          .from('reminders')
          .update({ due_date: newDue })
          .eq('schedule_id', s.id);
      }
    }
  }
}

/**
 * Delete or deactivate service type (safety rule: deactivate if referenced).
 */
export async function deleteServiceTypeInDb(businessId: string, id: string) {
  const supabase = createClient();

  // Check if referenced
  const { count: recordCount } = await supabase
    .from('service_records')
    .select('id', { count: 'exact', head: true })
    .eq('service_type_id', id);

  const { count: scheduleCount } = await supabase
    .from('service_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('service_type_id', id);

  const isReferenced = (recordCount && recordCount > 0) || (scheduleCount && scheduleCount > 0);

  if (isReferenced) {
    // Deactivate instead
    await supabase
      .from('service_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', businessId);

    return {
      success: false,
      reason: 'Cannot delete because it is referenced by existing customer records. It has been deactivated instead.',
    };
  }

  const { error } = await supabase
    .from('service_types')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);

  if (error) throw error;
  return { success: true };
}

/**
 * Toggle active status of a service type.
 */
export async function toggleServiceTypeStatusInDb(businessId: string, id: string, currentStatus: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from('service_types')
    .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId);

  if (error) throw error;
}

/**
 * Update message template.
 */
export async function updateMessageTemplateInDb(businessId: string, template: WhatsAppTemplate) {
  const supabase = createClient();
  const { error } = await supabase
    .from('message_templates')
    .update({
      message_body: template.templateText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', template.id)
    .eq('business_id', businessId);

  if (error) throw error;
}

/**
 * Update business profile settings.
 */
export async function updateBusinessInDb(businessId: string, biz: BusinessProfile) {
  const supabase = createClient();
  const { error } = await supabase
    .from('businesses')
    .update({
      name: biz.name.trim(),
      phone: biz.phone?.trim() || null,
      business_type: biz.industry,
      address: biz.city,
      currency: biz.currency,
      default_interval_months: biz.defaultIntervalMonths,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  if (error) throw error;
}

/**
 * Map a database customer row to the application Customer domain model.
 */
export function mapDbCustomerToApp(c: DbCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email || undefined,
    address: c.address || '',
    locality: c.locality || undefined,
    notes: c.notes || undefined,
    createdAt: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

/**
 * Map a database asset row to the application Asset domain model.
 */
export function mapDbAssetToApp(a: DbAsset): Asset {
  return {
    id: a.id,
    customerId: a.customer_id,
    name: a.brand ? `${a.brand} ${a.asset_type}` : a.asset_type,
    model: a.model || undefined,
    capacity: a.capacity || undefined,
    location: a.location || undefined,
    installDate: a.installation_date || undefined,
    notes: a.notes || undefined,
  };
}

/**
 * Map a database service type row to the application ServiceCatalogItem model.
 */
export function mapDbServiceTypeToApp(t: DbServiceType): ServiceCatalogItem {
  return {
    id: t.id,
    name: t.name,
    description: t.description || undefined,
    intervalValue: t.interval_value,
    intervalUnit: t.interval_unit,
    defaultIntervalMonths:
      t.interval_unit === 'YEARS'
        ? t.interval_value * 12
        : t.interval_unit === 'DAYS'
        ? Math.max(1, Math.round(t.interval_value / 30))
        : t.interval_value,
    typicalPrice: Number(t.typical_fee),
    isActive: t.is_active,
  };
}

/**
 * Map a database service schedule row to the application ServiceRecord domain model.
 */
export function mapDbScheduleToApp(
  s: DbServiceSchedule,
  reminder?: DbReminder,
  catalog?: ServiceCatalogItem[]
): ServiceRecord {
  const dueDate = s.next_due_date;
  const catItem = catalog?.find((c) => c.name.toLowerCase() === s.service_name.toLowerCase());

  return {
    id: s.id,
    customerId: s.customer_id,
    assetId: s.asset_id || '',
    serviceName: s.service_name,
    lastServiceDate: s.last_service_date || '',
    nextDueDate: dueDate,
    intervalMonths:
      s.interval_unit === 'YEARS'
        ? s.interval_value * 12
        : s.interval_unit === 'DAYS'
        ? Math.max(1, Math.round(s.interval_value / 30))
        : s.interval_value,
    intervalValue: s.interval_value,
    intervalUnit: s.interval_unit,
    serviceAmount: catItem ? catItem.typicalPrice : 1200,
    urgency: calculateDueStatus(dueDate).urgency,
    followUpStatus: (reminder?.status || 'NOT_CONTACTED') as FollowUpStatus,
    lastContactedAt: reminder?.contacted_at || undefined,
    bookingDate: reminder?.booked_at || undefined,
    completedDate: reminder?.completed_at || undefined,
    notes: reminder?.notes || undefined,
  };
}

export { generateWhatsAppLink as buildWhatsAppFollowUpLink } from '../whatsapp';
