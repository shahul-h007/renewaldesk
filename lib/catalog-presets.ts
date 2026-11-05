import { IntervalUnit, ServiceCatalogItem, WhatsAppTemplate } from './types';

export type BusinessCategoryKey =
  | 'ac'
  | 'vehicle'
  | 'pest_control'
  | 'water_purifier'
  | 'appliance'
  | 'cleaning'
  | 'solar'
  | 'electrical_plumbing'
  | 'other';

export interface PresetService {
  name: string;
  description: string;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  typicalPrice: number;
}

export interface PresetTemplate {
  type: WhatsAppTemplate['type'];
  name: string;
  templateText: string;
}

export interface CategoryPresetConfig {
  key: BusinessCategoryKey;
  label: string;
  assetLabel: string;
  assetPlaceholder: string;
  capacityLabel: string;
  capacityPlaceholder: string;
  locationLabel: string;
  locationPlaceholder: string;
  services: PresetService[];
  templates: PresetTemplate[];
}

export const BUSINESS_TYPE_OPTIONS = [
  'Air Conditioning Maintenance',
  'Vehicle Service & Auto Care',
  'Pest Control Services',
  'RO Water Purifier Service',
  'Appliance Repair & Maintenance',
  'Home Cleaning & Deep Wash',
  'Solar Panel Maintenance',
  'General Electrical & Plumbing',
  'Other',
] as const;

export const CATEGORY_PRESETS: Record<BusinessCategoryKey, CategoryPresetConfig> = {
  ac: {
    key: 'ac',
    label: 'Air Conditioning Maintenance',
    assetLabel: 'Air Conditioner',
    assetPlaceholder: 'e.g. Daikin 1.5 Ton Split AC',
    capacityLabel: 'Tonnage / Capacity',
    capacityPlaceholder: 'e.g. 1.5 Ton',
    locationLabel: 'Room / Location',
    locationPlaceholder: 'e.g. Master Bedroom',
    services: [
      {
        name: 'AC Periodic General Service',
        description: 'Standard filter wash, coil inspection & drainage flush',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Deep Jet Chemical Foam Wash',
        description: 'High-pressure foam jet wash for heavy cooling restoration',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 1800,
      },
      {
        name: 'Refrigerant Gas Leak & Top-up',
        description: 'Pressure test, leak sealing & Freon gas top-up',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 2200,
      },
      {
        name: 'Annual Maintenance Contract (AMC)',
        description: 'Comprehensive quarterly routine visits & emergency breakdowns',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 3500,
      },
      {
        name: 'Coil & Condenser Clean',
        description: 'Indoor evaporator & outdoor condenser coil decontamination',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 950,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule a technician visit this week?',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Delaying service may lead to higher power bills or cooling loss. Reply to book your slot!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arriving.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}.',
      },
    ],
  },

  vehicle: {
    key: 'vehicle',
    label: 'Vehicle Service & Auto Care',
    assetLabel: 'Vehicle / Reg No.',
    assetPlaceholder: 'e.g. Hyundai Creta (KL-07-CD-1234)',
    capacityLabel: 'Engine / Fuel Type',
    capacityPlaceholder: 'e.g. 1.5L Diesel',
    locationLabel: 'Garage / Bay',
    locationPlaceholder: 'e.g. Owner Bay / Workshop',
    services: [
      {
        name: 'Periodic Vehicle Maintenance',
        description: 'Comprehensive periodic service, fluids top-up & multi-point safety check',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 3000,
      },
      {
        name: 'Engine Oil & Filter Replacement',
        description: 'Synthetic/mineral engine oil drain and genuine oil filter change',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1800,
      },
      {
        name: 'Brake System Inspection & Service',
        description: 'Brake pads, fluid test, disc resurfacing & caliper check',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Tyre Rotation & Wheel Alignment',
        description: 'Computerized wheel alignment, wheel balancing & tyre rotation',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 800,
      },
      {
        name: 'Comprehensive Vehicle Safety Audit',
        description: 'Multipoint safety inspection including battery, suspension & electricals',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 1500,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, greetings from {{business_name}}! Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like to reserve a service bay this week? Reply with your preferred date and time.',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we book your vehicle in today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} for {{asset_name}} is overdue by {{days_overdue}} days. Delaying routine servicing can cause engine wear or unexpected breakdowns. Reply to schedule your visit!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your vehicle service appointment with {{business_name}} is confirmed for {{booking_date}}. Please drive in at your scheduled time or call us if you need pickup.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is completed. Your next periodic maintenance is scheduled for {{next_due_date}}.',
      },
    ],
  },

  pest_control: {
    key: 'pest_control',
    label: 'Pest Control Services',
    assetLabel: 'Property / Premises',
    assetPlaceholder: 'e.g. 3BHK Apartment / Office Floor',
    capacityLabel: 'Property Size',
    capacityPlaceholder: 'e.g. 1,500 sq ft',
    locationLabel: 'Target Areas',
    locationPlaceholder: 'e.g. Kitchen, Balcony & Drains',
    services: [
      {
        name: 'General Pest Control Treatment',
        description: 'Quarterly spray and gel baiting for cockroaches, ants & insects',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Termite Inspection & Protection',
        description: 'Annual structural drilling, barrier injection & wood inspection',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 4500,
      },
      {
        name: 'Rodent Control & Exclusion',
        description: 'Traps, bait stations & rodent entry proofing audit',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1500,
      },
      {
        name: 'Preventive Disinfestation Spray',
        description: 'Broad-spectrum odorless mist spray for preventive hygiene',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1800,
      },
      {
        name: 'Quarterly Follow-up Inspection',
        description: 'Follow-up visit to inspect bait stations and reapply treatments',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1000,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule our technician visit this week?',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Would today or tomorrow be convenient for our technician to visit?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely preventive treatment prevents pest resurgence. Reply to confirm your visit!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your pest treatment visit with {{business_name}} is confirmed for {{booking_date}}. Our specialist will arrive with protective gear.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next protective cycle is scheduled for {{next_due_date}}.',
      },
    ],
  },

  water_purifier: {
    key: 'water_purifier',
    label: 'RO Water Purifier Service',
    assetLabel: 'Water Purifier',
    assetPlaceholder: 'e.g. Kent Grand Plus RO + UV',
    capacityLabel: 'Storage Capacity',
    capacityPlaceholder: 'e.g. 8 Litres',
    locationLabel: 'Installation Spot',
    locationPlaceholder: 'e.g. Kitchen Wall',
    services: [
      {
        name: 'Periodic Filter Replacement',
        description: 'Sediment, pre-carbon & post-carbon cartridge replacement',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'RO Membrane Inspection & Cleaning',
        description: 'Membrane flush, TDS verification & pure water flow test',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 2000,
      },
      {
        name: 'TDS Check & Leakage Audit',
        description: 'Water purity measurement, valve pressure test & leak sealing',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 500,
      },
      {
        name: 'Complete Purifier Sanitization',
        description: 'Full tank sterilization, tube flushing & pump health audit',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 2500,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Regular filter replacement ensures safe and pure drinking water. Reply to book your visit!',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we dispatch a service technician today?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Overdue filters can affect drinking water quality and water output. Reply to book a quick filter change!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your purifier service with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arrival.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is completed. Your next maintenance is scheduled for {{next_due_date}}.',
      },
    ],
  },

  appliance: {
    key: 'appliance',
    label: 'Appliance Repair & Maintenance',
    assetLabel: 'Home Appliance',
    assetPlaceholder: 'e.g. LG Front Load Washing Machine',
    capacityLabel: 'Capacity / Model Spec',
    capacityPlaceholder: 'e.g. 8 kg / Inverter Motor',
    locationLabel: 'Location in Home',
    locationPlaceholder: 'e.g. Utility Room',
    services: [
      {
        name: 'Comprehensive Appliance Health Check',
        description: 'Electrical inspection, motor calibration & diagnostic check',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 999,
      },
      {
        name: 'Refrigerator Coil & Compressor Service',
        description: 'Condenser coil cleaning, defrost test & gas pressure check',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Washing Machine Descaling & Tub Clean',
        description: 'High-temperature descaling, drum balance & filter clean',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1100,
      },
      {
        name: 'Microwave & Oven Performance Check',
        description: 'Magnetron safety test, door seal audit & heating verification',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 800,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, this is {{business_name}}. Your scheduled {{service_name}} for {{asset_name}} is due on {{due_date}}. Would you like us to schedule a home visit this week?',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Preventive maintenance protects appliance lifespan and prevents breakdown. Reply to book your slot!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call before arriving.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next periodic maintenance is scheduled for {{next_due_date}}.',
      },
    ],
  },

  cleaning: {
    key: 'cleaning',
    label: 'Home Cleaning & Deep Wash',
    assetLabel: 'Residence / Property',
    assetPlaceholder: 'e.g. Villa 14 / 2BHK Apartment',
    capacityLabel: 'Built-up Area',
    capacityPlaceholder: 'e.g. 1,800 sq ft',
    locationLabel: 'Scope / Focus',
    locationPlaceholder: 'e.g. Entire Home',
    services: [
      {
        name: 'Deep Home Sanitization & Cleaning',
        description: 'Full deep cleaning of floors, windows, balconies & high touchpoints',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 3500,
      },
      {
        name: 'Kitchen & Chimney Degreasing',
        description: 'Deep degreasing of chimney filters, stovetop, tiles & countertops',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1800,
      },
      {
        name: 'Bathroom Deep Disinfection',
        description: 'Tile scrubbing, descaling, sanitaryware polishing & sanitization',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Sofa & Mattress Shampooing',
        description: 'Fabric steam extraction, stain treatment & deodorization',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1500,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, greetings from {{business_name}}! Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Shall we reserve our cleaning crew for your preferred slot this week?',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Shall we schedule our crew today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Keep your spaces fresh, sanitized, and hygienic. Reply to schedule our team!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your cleaning service with {{business_name}} is confirmed for {{booking_date}}. Our crew will arrive fully equipped.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is finished. Your next cleaning cycle is scheduled for {{next_due_date}}.',
      },
    ],
  },

  solar: {
    key: 'solar',
    label: 'Solar Panel Maintenance',
    assetLabel: 'Solar Power System',
    assetPlaceholder: 'e.g. 5kW Rooftop Solar System',
    capacityLabel: 'System Capacity',
    capacityPlaceholder: 'e.g. 5 kW',
    locationLabel: 'Rooftop / Locus',
    locationPlaceholder: 'e.g. Main Terrace',
    services: [
      {
        name: 'Routine Panel Cleaning & De-dusting',
        description: 'De-ionized water wash, dust removal & visual crack inspection',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1500,
      },
      {
        name: 'Inverter & Electrical Wiring Audit',
        description: 'Inverter efficiency test, junction box check & DC cable inspection',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 2000,
      },
      {
        name: 'Annual Solar Performance Check',
        description: 'Comprehensive generation yield test, earthing & structural integrity audit',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 3500,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for your solar installation is due on {{due_date}}. Clean panels generate up to 25% more power. Reply to schedule our team visit!',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we schedule our service team for today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Dust buildup reduces solar generation daily. Reply to confirm your maintenance slot!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your solar maintenance visit with {{business_name}} is confirmed for {{booking_date}}. Our crew will arrive as scheduled.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next maintenance cycle is scheduled for {{next_due_date}}.',
      },
    ],
  },

  electrical_plumbing: {
    key: 'electrical_plumbing',
    label: 'General Electrical & Plumbing',
    assetLabel: 'Premises Installation',
    assetPlaceholder: 'e.g. Residential Electrical & Plumbing',
    capacityLabel: 'Phase / Supply',
    capacityPlaceholder: 'e.g. 3-Phase / 5kW',
    locationLabel: 'Facility / Floor',
    locationPlaceholder: 'e.g. Ground + 1st Floor',
    services: [
      {
        name: 'Routine Electrical Safety Inspection',
        description: 'MCB test, switchboard thermal check & earthing resistance test',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1000,
      },
      {
        name: 'Plumbing Pipe & Leakage Audit',
        description: 'Pressure check, pipe joint inspection & drainage clearance',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1200,
      },
      {
        name: 'Water Tank Inspection & Cleaning',
        description: 'Overhead tank draining, mechanical scrubbing & UV sanitization',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1800,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, greetings from {{business_name}}! Your scheduled {{service_name}} is due on {{due_date}}. Would you like us to schedule our technician to visit this week?',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your {{service_name}} with {{business_name}} is due today. Shall we send our technician today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely maintenance prevents electrical hazards and plumbing leaks. Reply to book your visit!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. Our technician will call you before arriving.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} is complete. Your next maintenance cycle is scheduled for {{next_due_date}}.',
      },
    ],
  },

  other: {
    key: 'other',
    label: 'Other',
    assetLabel: 'Asset / Equipment',
    assetPlaceholder: 'e.g. Equipment Unit / Identifier',
    capacityLabel: 'Specification',
    capacityPlaceholder: 'e.g. Standard',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g. Primary Location',
    services: [
      {
        name: 'Periodic Routine Service',
        description: 'Standard scheduled maintenance and routine operational check',
        intervalValue: 6,
        intervalUnit: 'MONTHS',
        typicalPrice: 1500,
      },
      {
        name: 'Comprehensive Annual Inspection',
        description: 'In-depth diagnostic check and preventive servicing',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 2500,
      },
      {
        name: 'Quarterly Preventive Health Check',
        description: 'Regular preventive checkup and performance tuning',
        intervalValue: 3,
        intervalUnit: 'MONTHS',
        typicalPrice: 1000,
      },
      {
        name: 'Annual Contract Service (AMC)',
        description: 'Priority routine visits and emergency breakdown support',
        intervalValue: 12,
        intervalUnit: 'MONTHS',
        typicalPrice: 3500,
      },
    ],
    templates: [
      {
        type: 'DUE_SOON',
        name: 'Service Due Soon',
        templateText:
          'Hi {{customer_name}}, greetings from {{business_name}}! Your scheduled {{service_name}} is due on {{due_date}}. Would you like us to arrange a service visit this week? Reply with your preferred day.',
      },
      {
        type: 'DUE_TODAY',
        name: 'Service Due Today',
        templateText:
          'Good morning {{customer_name}}! Your scheduled {{service_name}} with {{business_name}} is due today. Shall we confirm an appointment for today or tomorrow?',
      },
      {
        type: 'OVERDUE',
        name: 'Service Overdue',
        templateText:
          'Hello {{customer_name}}, your {{service_name}} is overdue by {{days_overdue}} days. Timely servicing keeps everything running smoothly and prevents costly repairs. Reply to book your slot!',
      },
      {
        type: 'BOOKING_CONFIRMATION',
        name: 'Booking Confirmation',
        templateText:
          'Hi {{customer_name}}, your service appointment with {{business_name}} is confirmed for {{booking_date}}. We look forward to serving you.',
      },
      {
        type: 'SERVICE_COMPLETED',
        name: 'Service Completed',
        templateText:
          'Thank you {{customer_name}} for choosing {{business_name}}! Your {{service_name}} has been completed. Your next periodic maintenance is scheduled for {{next_due_date}}.',
      },
    ],
  },
};

/**
 * Normalizes any category string into one of the supported BusinessCategoryKey identifiers.
 * Safely falls back to 'other' for unrecognized or empty inputs.
 */
export function normalizeCategory(category?: string | null): BusinessCategoryKey {
  if (!category) return 'other';
  const c = category.toLowerCase().trim();

  if (
    c.includes('vehicle') ||
    c.includes('auto') ||
    c.includes('car') ||
    c.includes('motor') ||
    c.includes('bike') ||
    c.includes('garage')
  ) {
    return 'vehicle';
  }
  if (c.includes('pest') || c.includes('termite') || c.includes('rodent') || c.includes('bug')) {
    return 'pest_control';
  }
  if (
    c.includes('purifier') ||
    c.includes('water') ||
    c.includes(' ro ') ||
    c.startsWith('ro ') ||
    c.endsWith(' ro') ||
    c === 'ro'
  ) {
    return 'water_purifier';
  }
  if (
    c.includes('air condition') ||
    c.includes('ac ') ||
    c.startsWith('ac') ||
    c.includes('hvac') ||
    c.includes('cooling') ||
    c.includes('chill')
  ) {
    return 'ac';
  }
  if (
    c.includes('appliance') ||
    c.includes('refrigerator') ||
    c.includes('fridge') ||
    c.includes('washing machine') ||
    c.includes('microwave')
  ) {
    return 'appliance';
  }
  if (c.includes('clean') || c.includes('wash') || c.includes('housekeeping')) {
    return 'cleaning';
  }
  if (c.includes('solar')) {
    return 'solar';
  }
  if (c.includes('electric') || c.includes('plumb')) {
    return 'electrical_plumbing';
  }
  return 'other';
}

/**
 * Retrieves the full category metadata configuration for any business type.
 */
export function getCategoryMetadata(category?: string | null): CategoryPresetConfig {
  const key = normalizeCategory(category);
  return CATEGORY_PRESETS[key] || CATEGORY_PRESETS.other;
}

/**
 * Generates an array of ServiceCatalogItem models pre-populated with IDs and sensible defaults
 * for the requested business category.
 */
export function getPresetsForCategory(category?: string | null): ServiceCatalogItem[] {
  const config = getCategoryMetadata(category);
  return config.services.map((s, idx) => ({
    id: `preset-${config.key}-${idx + 1}`,
    name: s.name,
    description: s.description,
    intervalValue: s.intervalValue,
    intervalUnit: s.intervalUnit,
    defaultIntervalMonths:
      s.intervalUnit === 'MONTHS'
        ? s.intervalValue
        : s.intervalUnit === 'YEARS'
        ? s.intervalValue * 12
        : Math.max(1, Math.round(s.intervalValue / 30)),
    typicalPrice: s.typicalPrice,
    isActive: true,
  }));
}

/**
 * Generates initial starter WhatsApp templates for the requested business category.
 */
export function getInitialTemplatesForCategory(category?: string | null): WhatsAppTemplate[] {
  const config = getCategoryMetadata(category);
  return config.templates.map((t, idx) => ({
    id: `tpl-${config.key}-${idx + 1}`,
    type: t.type,
    name: t.name,
    templateText: t.templateText,
  }));
}

/**
 * Resolves any category string, preset key, or legacy alias to its canonical display label from BUSINESS_TYPE_OPTIONS.
 */
export function getCanonicalCategoryLabel(category?: string | null): string {
  if (!category) return BUSINESS_TYPE_OPTIONS[0];
  const trimmed = category.trim();
  // Exact match
  const exact = BUSINESS_TYPE_OPTIONS.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  // Normalized match
  const key = normalizeCategory(trimmed);
  return CATEGORY_PRESETS[key]?.label || BUSINESS_TYPE_OPTIONS[0];
}

