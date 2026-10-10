'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, Asset, ServiceRecord, ServiceCatalogItem, WhatsAppTemplate, BusinessProfile, FollowUpStatus, IntervalUnit } from './types';
import { calculateDueStatus, calculateNextDueDate } from './due-date-engine';
import { DEFAULT_TEMPLATES } from './whatsapp';
import { useAuth } from './auth-context';
import {
  fetchBusinessData,
  createCustomerInDb,
  updateCustomerInDb,
  archiveCustomerInDb,
  importCustomersFromCSVInDb,
  updateFollowUpStatusInDb,
  markServiceCompletedInDb,
  addServiceTypeInDb,
  updateServiceTypeInDb,
  deleteServiceTypeInDb,
  toggleServiceTypeStatusInDb,
  updateMessageTemplateInDb,
  updateBusinessInDb,
} from './db/operations';

interface RenewalDeskContextType {
  customers: Customer[];
  assets: Asset[];
  services: ServiceRecord[];
  catalog: ServiceCatalogItem[];
  templates: WhatsAppTemplate[];
  business: BusinessProfile;
  isLoaded: boolean;
  isLoadingDb: boolean;
  dbError: string | null;
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>, asset: Omit<Asset, 'id' | 'customerId'>, service: Omit<ServiceRecord, 'id' | 'customerId' | 'assetId' | 'urgency'>) => void;
  updateCustomer: (cust: Customer) => void;
  deleteCustomer: (id: string) => void;
  updateFollowUpStatus: (serviceId: string, status: FollowUpStatus) => void;
  markServiceCompleted: (
    serviceId: string,
    completedDate?: string,
    amountCollected?: number,
    intervalValOverride?: number,
    intervalUnitOverride?: IntervalUnit
  ) => { nextDueDate: string };
  importCustomersFromCSV: (validRows: any[]) => number;
  updateTemplate: (tpl: WhatsAppTemplate) => void;
  updateBusiness: (biz: BusinessProfile) => void;
  addServiceType: (data: Omit<ServiceCatalogItem, 'id'>) => ServiceCatalogItem;
  updateServiceType: (item: ServiceCatalogItem, updateExistingUpcoming?: boolean) => void;
  deleteServiceType: (id: string) => { success: boolean; reason?: string };
  toggleServiceTypeStatus: (id: string) => void;
  resetDemoData: () => void;
  isDatabaseMode: boolean;
  reloadFromDb?: () => Promise<void>;
}

const INITIAL_BUSINESS: BusinessProfile = {
  name: 'Kochi Chill AC Care',
  phone: '+91 98460 11223',
  industry: 'Air Conditioning Maintenance',
  city: 'Kochi',
  currency: '₹',
  defaultIntervalMonths: 6,
};

const INITIAL_CATALOG: ServiceCatalogItem[] = [
  {
    id: 'cat-1',
    name: 'AC Periodic General Service',
    description: 'Standard filter wash, coil inspection & drainage flush',
    intervalValue: 6,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 6,
    typicalPrice: 1200,
    isActive: true,
  },
  {
    id: 'cat-2',
    name: 'Deep Jet Chemical Foam Wash',
    description: 'High-pressure foam jet wash for heavy cooling restoration',
    intervalValue: 12,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 12,
    typicalPrice: 1800,
    isActive: true,
  },
  {
    id: 'cat-3',
    name: 'Refrigerant Gas Leak & Top-up',
    description: 'Pressure test, leak sealing & Freon gas top-up',
    intervalValue: 12,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 12,
    typicalPrice: 2200,
    isActive: true,
  },
  {
    id: 'cat-4',
    name: 'Annual Maintenance Contract (AMC)',
    description: 'Comprehensive quarterly routine visits & emergency breakdowns',
    intervalValue: 3,
    intervalUnit: 'MONTHS',
    defaultIntervalMonths: 3,
    typicalPrice: 3500,
    isActive: true,
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Arun Kumar', phone: '9846012345', email: 'arun.k@gmail.com', address: 'Flat 4B, SkyLine Ivy', locality: 'Edappally, Kochi', createdAt: '2026-01-10' },
  { id: 'c-2', name: 'Faisal Mohammed', phone: '9745098765', email: 'faisal.m@yahoo.com', address: 'Near Jawaharlal Stadium', locality: 'Kaloor, Kochi', createdAt: '2026-02-14' },
  { id: 'c-3', name: 'Priya Nair', phone: '9946154321', email: 'priya.nair@outlook.com', address: 'Villa 12, InfoPark Enclave', locality: 'Kakkanad, Kochi', createdAt: '2026-03-01' },
  { id: 'c-4', name: 'George Varghese', phone: '9847233445', address: 'KP Vallon Road', locality: 'Kadavanthra, Kochi', createdAt: '2026-03-12' },
  { id: 'c-5', name: 'Nikhil Raj', phone: '9995088776', address: 'Railway Station Road', locality: 'Aluva, Kochi', createdAt: '2026-01-20' },
  { id: 'c-6', name: 'Anjali Menon', phone: '9846811223', address: 'Bay View Tower, Flat 802', locality: 'Marine Drive, Kochi', createdAt: '2026-02-28' },
  { id: 'c-7', name: 'Sneha Paul', phone: '9747144556', address: 'Main Avenue, Cross 4', locality: 'Panampilly Nagar, Kochi', createdAt: '2026-03-05' },
  { id: 'c-8', name: 'Mathew Thomas', phone: '9846366778', address: 'Princess Street', locality: 'Fort Kochi, Kochi', createdAt: '2026-04-01' },
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'a-1', customerId: 'c-1', name: 'Samsung Inverter Split AC', model: 'AR18CY3ZAPG', capacity: '1.5 Ton', location: 'Master Bedroom', installDate: '2024-04-10' },
  { id: 'a-2', customerId: 'c-2', name: 'Daikin 5-Star Inverter AC', model: 'FTKM50U', capacity: '1.5 Ton', location: 'Living Room', installDate: '2023-11-20' },
  { id: 'a-3', customerId: 'c-3', name: 'LG Dual Inverter Split AC', model: 'RS-Q19ENZE', capacity: '1.5 Ton', location: 'Bedroom 1', installDate: '2024-02-15' },
  { id: 'a-4', customerId: 'c-4', name: 'Voltas Window AC', model: '183V Vectra', capacity: '1.0 Ton', location: 'Study Room', installDate: '2022-05-10' },
  { id: 'a-5', customerId: 'c-5', name: 'Panasonic Smart Inverter AC', model: 'CS-KU18XKYF', capacity: '1.5 Ton', location: 'Hall', installDate: '2023-08-12' },
  { id: 'a-6', customerId: 'c-6', name: 'Blue Star Cassette AC', model: 'PC18EBT', capacity: '2.0 Ton', location: 'Office Room', installDate: '2024-01-18' },
  { id: 'a-7', customerId: 'c-7', name: 'Mitsubishi Heavy Industries AC', model: 'SRK18YXS-W6', capacity: '1.5 Ton', location: 'Master Bedroom', installDate: '2023-09-30' },
  { id: 'a-8', customerId: 'c-8', name: 'Carrier DuraEdge Split AC', model: 'CAI18ER3R30F0', capacity: '1.5 Ton', location: 'Guest Room', installDate: '2024-03-01' },
];

// Reference date dynamically calculated so Overdue and Due Today are always realistic relative to current date!
function generateSeedServices(): ServiceRecord[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() - n);
    return formatYMD(d);
  };

  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(today.getDate() + n);
    return formatYMD(d);
  };

  const monthsAgo = (m: number) => {
    const d = new Date();
    d.setMonth(today.getMonth() - m);
    return formatYMD(d);
  };

  const seeds = [
    {
      id: 's-1', customerId: 'c-1', assetId: 'a-1', serviceName: 'AC Periodic General Service',
      lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(5), intervalMonths: 6, serviceAmount: 1200,
      followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Filter cleaning + drainage flush'
    },
    {
      id: 's-2', customerId: 'c-2', assetId: 'a-2', serviceName: 'AC Periodic General Service',
      lastServiceDate: monthsAgo(6), nextDueDate: formatYMD(today), intervalMonths: 6, serviceAmount: 1200,
      followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Condenser coil inspection'
    },
    {
      id: 's-3', customerId: 'c-3', assetId: 'a-3', serviceName: 'Deep Jet Chemical Foam Wash',
      lastServiceDate: monthsAgo(12), nextDueDate: daysFromNow(3), intervalMonths: 12, serviceAmount: 1500,
      followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'High cooling load room'
    },
    {
      id: 's-4', customerId: 'c-4', assetId: 'a-4', serviceName: 'AC Periodic General Service',
      lastServiceDate: monthsAgo(6), nextDueDate: daysFromNow(5), intervalMonths: 6, serviceAmount: 900,
      followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Window unit bracket check'
    },
    {
      id: 's-5', customerId: 'c-5', assetId: 'a-5', serviceName: 'AC Periodic General Service',
      lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(12), intervalMonths: 6, serviceAmount: 1400,
      followUpStatus: 'NOT_CONTACTED' as FollowUpStatus, notes: 'Cooling slightly reduced'
    },
    {
      id: 's-6', customerId: 'c-6', assetId: 'a-6', serviceName: 'Deep Jet Chemical Foam Wash',
      lastServiceDate: monthsAgo(12), nextDueDate: daysAgo(2), intervalMonths: 12, serviceAmount: 1800,
      followUpStatus: 'CONTACTED' as FollowUpStatus, lastContactedAt: daysAgo(1), notes: 'WhatsApp sent yesterday, waiting for reply'
    },
    {
      id: 's-7', customerId: 'c-7', assetId: 'a-7', serviceName: 'AC Periodic General Service',
      lastServiceDate: monthsAgo(6), nextDueDate: daysAgo(1), intervalMonths: 6, serviceAmount: 2000,
      followUpStatus: 'BOOKED' as FollowUpStatus, bookingDate: daysFromNow(1), notes: 'Customer booked for tomorrow 11 AM'
    },
    {
      id: 's-8', customerId: 'c-8', assetId: 'a-8', serviceName: 'AC Periodic General Service',
      lastServiceDate: daysAgo(7), nextDueDate: daysFromNow(173), intervalMonths: 6, serviceAmount: 1200,
      followUpStatus: 'COMPLETED' as FollowUpStatus, completedDate: daysAgo(7), notes: 'Payment ₹1,200 collected via UPI'
    },
  ];

  return seeds.map(s => ({
    ...s,
    urgency: calculateDueStatus(s.nextDueDate).urgency,
  }));
}

const RenewalDeskContext = createContext<RenewalDeskContextType | null>(null);

export function RenewalDeskProvider({ children }: { children: React.ReactNode }) {
  const { user, business: authBiz, isConfigured, isLoading: isAuthLoading } = useAuth();
  const isDatabaseMode = Boolean(isConfigured && user && authBiz);

  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [services, setServices] = useState<ServiceRecord[]>(generateSeedServices);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>(INITIAL_CATALOG);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_TEMPLATES);
  const [business, setBusiness] = useState<BusinessProfile>(INITIAL_BUSINESS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Reload data from Supabase for authenticated business
  const reloadFromDb = useCallback(async () => {
    if (!authBiz) return;
    setIsLoadingDb(true);
    setDbError(null);
    try {
      const data = await fetchBusinessData(authBiz.id);
      setCustomers(data.customers);
      setAssets(data.assets);
      setServices(data.services);
      setCatalog(data.catalog);
      setTemplates(data.templates);
      setBusiness(data.business);
      setDbError(null);
    } catch (err: any) {
      console.error('Failed to load business data from Supabase:', err);
      setDbError(err.message || 'Failed to load business records from cloud database');
      // In database mode, do not display sample records as cloud data
      setCustomers([]);
      setAssets([]);
      setServices([]);
    } finally {
      setIsLoadingDb(false);
      setIsLoaded(true);
    }
  }, [authBiz]);

  // Load from Supabase in database mode, or LocalStorage in demo mode
  useEffect(() => {
    // 1. Wait for authentication determination before choosing data source
    if (isAuthLoading) {
      return;
    }

    // 2. Database mode: load from Supabase PostgreSQL
    if (isDatabaseMode && authBiz) {
      reloadFromDb();
      return;
    }

    // 3. User is authenticated but business is not yet configured: wait for onboarding
    if (isConfigured && user && !authBiz) {
      setIsLoaded(true);
      return;
    }

    // 4. Offline / Demo Mode: load from LocalStorage or seed data
    try {
      const storedCust = localStorage.getItem('rd_customers');
      const storedAssets = localStorage.getItem('rd_assets');
      const storedServices = localStorage.getItem('rd_services');
      const storedTemplates = localStorage.getItem('rd_templates');
      const storedBiz = localStorage.getItem('rd_business');
      const storedCat = localStorage.getItem('rd_catalog');

      if (storedCust && storedAssets && storedServices) {
        setCustomers(JSON.parse(storedCust));
        setAssets(JSON.parse(storedAssets));
        const rawServices = JSON.parse(storedServices);
        // Recalculate dynamic urgency based on current real-world date
        setServices(rawServices.map((s: ServiceRecord) => ({
          ...s,
          urgency: calculateDueStatus(s.nextDueDate).urgency,
        })));
      } else {
        const seedServices = generateSeedServices();
        setServices(seedServices);
        localStorage.setItem('rd_customers', JSON.stringify(INITIAL_CUSTOMERS));
        localStorage.setItem('rd_assets', JSON.stringify(INITIAL_ASSETS));
        localStorage.setItem('rd_services', JSON.stringify(seedServices));
      }

      if (storedTemplates) setTemplates(JSON.parse(storedTemplates));
      if (storedBiz) setBusiness(JSON.parse(storedBiz));
      if (storedCat) {
        try {
          const parsed = JSON.parse(storedCat);
          const migrated = parsed.map((item: any) => ({
            ...item,
            intervalValue: item.intervalValue ?? item.defaultIntervalMonths ?? 6,
            intervalUnit: item.intervalUnit ?? 'MONTHS',
            defaultIntervalMonths: item.defaultIntervalMonths ?? item.intervalValue ?? 6,
            typicalPrice: item.typicalPrice ?? 1200,
            isActive: item.isActive !== undefined ? item.isActive : true,
            description: item.description || '',
          }));
          setCatalog(migrated);
        } catch {
          setCatalog(INITIAL_CATALOG);
        }
      }
    } catch (e) {
      console.error('Error loading RenewalDesk state', e);
      setServices(generateSeedServices());
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthLoading, isDatabaseMode, authBiz, isConfigured, user, reloadFromDb]);

  // Sync to LocalStorage on changes when in demo/offline mode ONLY
  useEffect(() => {
    if (!isLoaded || isDatabaseMode || isAuthLoading || (isConfigured && user)) return;
    try {
      localStorage.setItem('rd_customers', JSON.stringify(customers));
      localStorage.setItem('rd_assets', JSON.stringify(assets));
      localStorage.setItem('rd_services', JSON.stringify(services));
      localStorage.setItem('rd_templates', JSON.stringify(templates));
      localStorage.setItem('rd_business', JSON.stringify(business));
      localStorage.setItem('rd_catalog', JSON.stringify(catalog));
    } catch (e) {
      console.error('Error saving state to localStorage', e);
    }
  }, [customers, assets, services, templates, business, catalog, isLoaded, isDatabaseMode, isAuthLoading, isConfigured, user]);

  const addCustomer = (
    custData: Omit<Customer, 'id' | 'createdAt'>,
    assetData: Omit<Asset, 'id' | 'customerId'>,
    serviceData: Omit<ServiceRecord, 'id' | 'customerId' | 'assetId' | 'urgency'>
  ) => {
    const custId = `c-${Date.now()}`;
    const assetId = `a-${Date.now()}`;
    const serviceId = `s-${Date.now()}`;

    const newCustomer: Customer = {
      ...custData,
      id: custId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const newAsset: Asset = {
      ...assetData,
      id: assetId,
      customerId: custId,
    };

    const newService: ServiceRecord = {
      ...serviceData,
      id: serviceId,
      customerId: custId,
      assetId: assetId,
      urgency: calculateDueStatus(serviceData.nextDueDate).urgency,
    };

    setCustomers(prev => [newCustomer, ...prev]);
    setAssets(prev => [newAsset, ...prev]);
    setServices(prev => [newService, ...prev]);

    if (isDatabaseMode && authBiz) {
      createCustomerInDb(authBiz.id, custData, assetData, serviceData)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error creating customer:', err));
    }
  };

  const updateCustomer = (cust: Customer) => {
    setCustomers(prev => prev.map(c => c.id === cust.id ? cust : c));
    if (isDatabaseMode && authBiz) {
      updateCustomerInDb(authBiz.id, cust)
        .then(() => reloadFromDb())
        .catch(err => {
          console.error('Database error updating customer:', err);
          reloadFromDb();
        });
    }
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setAssets(prev => prev.filter(a => a.customerId !== id));
    setServices(prev => prev.filter(s => s.customerId !== id));
    if (isDatabaseMode && authBiz) {
      archiveCustomerInDb(authBiz.id, id)
        .then(() => reloadFromDb())
        .catch(err => {
          console.error('Database error archiving customer:', err);
          reloadFromDb();
        });
    }
  };

  const updateFollowUpStatus = (serviceId: string, status: FollowUpStatus) => {
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return {
        ...s,
        followUpStatus: status,
        lastContactedAt: status === 'CONTACTED' ? new Date().toISOString() : s.lastContactedAt,
      };
    }));

    if (isDatabaseMode && authBiz) {
      updateFollowUpStatusInDb(authBiz.id, serviceId, status)
        .catch(err => console.error('Database error updating follow-up status:', err));
    }
  };

  const markServiceCompleted = (
    serviceId: string,
    completedDate?: string,
    amountCollected?: number,
    intervalValOverride?: number,
    intervalUnitOverride?: IntervalUnit
  ) => {
    const targetService = services.find(s => s.id === serviceId);
    if (!targetService) return { nextDueDate: '' };

    const compDate = completedDate || new Date().toISOString().split('T')[0];
    
    // Lookup matching catalog item or use custom/recorded interval
    const catalogItem = catalog.find(c => c.name.toLowerCase() === targetService.serviceName.toLowerCase());
    const intervalVal = intervalValOverride !== undefined
      ? intervalValOverride
      : (catalogItem ? catalogItem.intervalValue : (targetService.intervalValue ?? targetService.intervalMonths ?? 6));
    const intervalUnit = intervalUnitOverride !== undefined
      ? intervalUnitOverride
      : (catalogItem ? catalogItem.intervalUnit : (targetService.intervalUnit ?? 'MONTHS'));

    const nextDue = calculateNextDueDate(compDate, intervalVal, intervalUnit);

    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return {
        ...s,
        followUpStatus: 'COMPLETED',
        completedDate: compDate,
        lastServiceDate: compDate,
        nextDueDate: nextDue,
        intervalValue: intervalVal,
        intervalUnit: intervalUnit,
        intervalMonths: intervalUnit === 'YEARS' ? intervalVal * 12 : (intervalUnit === 'DAYS' ? Math.max(1, Math.round(intervalVal / 30)) : intervalVal),
        urgency: calculateDueStatus(nextDue).urgency,
        serviceAmount: amountCollected !== undefined ? amountCollected : s.serviceAmount,
      };
    }));

    if (isDatabaseMode && authBiz) {
      markServiceCompletedInDb(authBiz.id, serviceId, compDate, Number(amountCollected || 0), intervalVal, intervalUnit)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error completing service:', err));
    }

    return { nextDueDate: nextDue };
  };

  const addServiceType = (data: Omit<ServiceCatalogItem, 'id'>) => {
    const trimmedName = data.name.trim();
    const existing = catalog.find(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      throw new Error(`A service type named "${trimmedName}" already exists.`);
    }

    const newItem: ServiceCatalogItem = {
      ...data,
      name: trimmedName,
      id: `cat-${Date.now()}`,
    };
    setCatalog(prev => [...prev, newItem]);

    if (isDatabaseMode && authBiz) {
      addServiceTypeInDb(authBiz.id, data)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error adding service type:', err));
    }

    return newItem;
  };

  const updateServiceType = (updatedItem: ServiceCatalogItem, updateExistingUpcoming = false) => {
    const trimmedName = updatedItem.name.trim();
    const duplicate = catalog.find(
      c => c.id !== updatedItem.id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another service type named "${trimmedName}" already exists.`);
    }

    const itemToSave = { ...updatedItem, name: trimmedName };
    const oldItem = catalog.find(c => c.id === itemToSave.id);
    setCatalog(prev => prev.map(c => c.id === itemToSave.id ? itemToSave : c));

    if (isDatabaseMode && authBiz) {
      updateServiceTypeInDb(authBiz.id, itemToSave, updateExistingUpcoming)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error updating service type:', err));
    }

    // When editing an interval, do not silently change due dates for existing customers.
    // Apply the new interval to future service cycles unless the user explicitly chooses otherwise.
    if (updateExistingUpcoming && oldItem) {
      setServices(prev => prev.map(s => {
        if (s.serviceName.toLowerCase() === oldItem.name.toLowerCase() && s.followUpStatus !== 'COMPLETED') {
          const baseDate = s.lastServiceDate || new Date().toISOString().split('T')[0];
          const newNextDue = calculateNextDueDate(baseDate, itemToSave.intervalValue, itemToSave.intervalUnit);
          return {
            ...s,
            serviceName: itemToSave.name,
            intervalValue: itemToSave.intervalValue,
            intervalUnit: itemToSave.intervalUnit,
            intervalMonths: itemToSave.defaultIntervalMonths,
            nextDueDate: newNextDue,
            urgency: calculateDueStatus(newNextDue).urgency,
          };
        }
        if (s.serviceName.toLowerCase() === oldItem.name.toLowerCase()) {
          return { ...s, serviceName: itemToSave.name };
        }
        return s;
      }));
    } else if (oldItem && oldItem.name !== itemToSave.name) {
      // Just update the serviceName label without changing due dates
      setServices(prev => prev.map(s => {
        if (s.serviceName.toLowerCase() === oldItem.name.toLowerCase()) {
          return { ...s, serviceName: itemToSave.name };
        }
        return s;
      }));
    }
  };

  const deleteServiceType = (id: string): { success: boolean; reason?: string } => {
    const item = catalog.find(c => c.id === id);
    if (!item) return { success: false, reason: 'Service type not found.' };

    const isReferenced = services.some(s => s.serviceName.toLowerCase() === item.name.toLowerCase());
    if (isReferenced) {
      // Never delete a service type referenced by existing records; deactivate it instead.
      setCatalog(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c));
      if (isDatabaseMode && authBiz) {
        toggleServiceTypeStatusInDb(authBiz.id, id, true)
          .then(() => reloadFromDb())
          .catch(err => console.error('Database error deactivating service type:', err));
      }
      return {
        success: false,
        reason: `Cannot delete "${item.name}" because it is referenced by existing customer records. It has been deactivated instead.`
      };
    }

    setCatalog(prev => prev.filter(c => c.id !== id));
    if (isDatabaseMode && authBiz) {
      deleteServiceTypeInDb(authBiz.id, id)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error deleting service type:', err));
    }
    return { success: true };
  };

  const toggleServiceTypeStatus = (id: string) => {
    const targetItem = catalog.find(c => c.id === id);
    setCatalog(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    if (isDatabaseMode && authBiz && targetItem) {
      toggleServiceTypeStatusInDb(authBiz.id, id, targetItem.isActive)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error toggling service type status:', err));
    }
  };

  const importCustomersFromCSV = (validRows: any[]) => {
    const timestamp = Date.now();
    const newCustomers: Customer[] = [];
    const newAssets: Asset[] = [];
    const newServices: ServiceRecord[] = [];

    validRows.forEach((row, i) => {
      const cId = `c-imp-${timestamp}-${i}`;
      const aId = `a-imp-${timestamp}-${i}`;
      const sId = `s-imp-${timestamp}-${i}`;

      const norm = row.normalized;
      if (!norm) return;

      newCustomers.push({
        id: cId,
        name: norm.name,
        phone: norm.phone,
        address: norm.address || 'Kochi',
        locality: 'Kochi',
        createdAt: new Date().toISOString().split('T')[0],
      });

      newAssets.push({
        id: aId,
        customerId: cId,
        name: norm.assetName || 'Air Conditioner',
      });

      newServices.push({
        id: sId,
        customerId: cId,
        assetId: aId,
        serviceName: 'AC Periodic General Service',
        lastServiceDate: norm.lastServiceDate,
        nextDueDate: norm.nextDueDate,
        intervalMonths: 6,
        serviceAmount: norm.serviceAmount || 1200,
        urgency: calculateDueStatus(norm.nextDueDate).urgency,
        followUpStatus: 'NOT_CONTACTED',
      });
    });

    setCustomers(prev => [...newCustomers, ...prev]);
    setAssets(prev => [...newAssets, ...prev]);
    setServices(prev => [...newServices, ...prev]);

    if (isDatabaseMode && authBiz) {
      importCustomersFromCSVInDb(authBiz.id, validRows)
        .then(() => reloadFromDb())
        .catch(err => {
          console.error('Database error importing customers:', err);
          reloadFromDb();
        });
    }

    return newCustomers.length;
  };

  const updateTemplate = (tpl: WhatsAppTemplate) => {
    setTemplates(prev => prev.map(t => t.id === tpl.id ? tpl : t));
    if (isDatabaseMode && authBiz) {
      updateMessageTemplateInDb(authBiz.id, tpl)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error updating template:', err));
    }
  };

  const updateBusiness = (biz: BusinessProfile) => {
    setBusiness(biz);
    if (isDatabaseMode && authBiz) {
      updateBusinessInDb(authBiz.id, biz)
        .then(() => reloadFromDb())
        .catch(err => console.error('Database error updating business profile:', err));
    }
  };

  const resetDemoData = () => {
    if (isDatabaseMode) {
      console.warn('Cannot reset demo data while connected to PostgreSQL Cloud mode.');
      return;
    }
    localStorage.removeItem('rd_customers');
    localStorage.removeItem('rd_assets');
    localStorage.removeItem('rd_services');
    localStorage.removeItem('rd_templates');
    localStorage.removeItem('rd_business');
    localStorage.removeItem('rd_catalog');
    setCustomers(INITIAL_CUSTOMERS);
    setAssets(INITIAL_ASSETS);
    setServices(generateSeedServices());
    setTemplates(DEFAULT_TEMPLATES);
    setBusiness(INITIAL_BUSINESS);
    setCatalog(INITIAL_CATALOG);
  };

  return (
    <RenewalDeskContext.Provider
      value={{
        customers,
        assets,
        services,
        catalog,
        templates,
        business,
        isLoaded,
        isLoadingDb,
        dbError,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        updateFollowUpStatus,
        markServiceCompleted,
        importCustomersFromCSV,
        updateTemplate,
        updateBusiness,
        addServiceType,
        updateServiceType,
        deleteServiceType,
        toggleServiceTypeStatus,
        resetDemoData,
        isDatabaseMode,
        reloadFromDb,
      }}
    >
      {children}
    </RenewalDeskContext.Provider>
  );
}

export function useRenewalDesk() {
  const context = useContext(RenewalDeskContext);
  if (!context) {
    throw new Error('useRenewalDesk must be used within RenewalDeskProvider');
  }
  return context;
}
