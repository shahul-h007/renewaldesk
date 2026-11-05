import { getCategoryMetadata } from './catalog-presets';

export interface CSVMapping {
  nameCol: string;
  phoneCol: string;
  assetCol: string;
  lastDateCol: string;
  nextDateCol: string;
  amountCol: string;
  addressCol: string;
  localityCol?: string;
  cityCol?: string;
  pincodeCol?: string;
  landmarkCol?: string;
}

export interface ExistingCustomerMatch {
  name: string;
  phone: string;
  isArchived?: boolean;
}

export interface ParsedCSVRow {
  rowIndex: number;
  raw: Record<string, string>;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  isDuplicateInCSV?: boolean;
  isExistingCustomer?: boolean;
  existingCustomerName?: string;
  normalized?: {
    name: string;
    phone: string;
    assetName: string;
    lastServiceDate: string;
    nextDueDate: string;
    serviceAmount: number;
    address: string;
    locality?: string;
    city?: string;
    pincode?: string;
    landmark?: string;
    isSample?: boolean;
  };
}

export interface CSVParseResult {
  headers: string[];
  totalRows: number;
  validRows: ParsedCSVRow[];
  invalidRows: ParsedCSVRow[];
  duplicateCSVRows: ParsedCSVRow[];
  existingCustomerRows: ParsedCSVRow[];
  suggestedMapping: CSVMapping;
}

export interface ValidateOptions {
  defaultIntervalMonths?: number;
  existingCustomers?: ExistingCustomerMatch[];
  defaultAssetLabel?: string;
  category?: string;
}

/**
 * Normalizes phone numbers to digits only, taking the last 10 digits.
 * e.g., '+91 98460 55441' -> '9846055441', '09846055441' -> '9846055441'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Basic robust CSV string parser handling quotes, commas, and newlines.
 */
export function parseCSVText(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] || '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Intelligently guesses column mappings based on common column header aliases.
 */
export function guessMapping(headers: string[]): CSVMapping {
  const findMatch = (aliases: string[]) => {
    return headers.find(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return aliases.some(alias => clean.includes(alias));
    }) || '';
  };

  const addressCol = findMatch(['address', 'flat', 'street', 'house', 'location']);
  const localityCol = findMatch(['locality', 'area', 'neighborhood', 'sector']);

  return {
    nameCol: findMatch(['name', 'customer', 'client']),
    phoneCol: findMatch(['phone', 'mobile', 'contact', 'whatsapp', 'cell', 'tel']),
    assetCol: findMatch(['asset', 'appliance', 'model', 'acmodel', 'device', 'equipment']),
    lastDateCol: findMatch(['lastservice', 'lastdate', 'servicedate', 'previousdate', 'installation']),
    nextDateCol: findMatch(['nextdue', 'duedate', 'nextservice', 'renewaldate']),
    amountCol: findMatch(['amount', 'price', 'fee', 'value', 'charge', 'rate', 'cost']),
    addressCol: addressCol || localityCol,
    localityCol: addressCol ? localityCol : '',
    cityCol: findMatch(['city', 'town', 'district']),
    pincodeCol: findMatch(['pincode', 'pin', 'postalcode', 'zip', 'zipcode']),
    landmarkCol: findMatch(['landmark']),
  };
}

/**
 * Normalizes different date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) into standard YYYY-MM-DD.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // Day/Month/Year
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    if (parts[0].length === 4) {
      // Year/Month/Day
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return clean;
}

/**
 * Validates rows against business rules, flags duplicates, and maps to application domain model.
 */
export function validateAndMapRows(
  rows: Record<string, string>[],
  mapping: CSVMapping,
  optionsOrDefault: number | ValidateOptions = 6
): {
  validRows: ParsedCSVRow[];
  invalidRows: ParsedCSVRow[];
  duplicateCSVRows: ParsedCSVRow[];
  existingCustomerRows: ParsedCSVRow[];
} {
  const defaultIntervalMonths =
    typeof optionsOrDefault === 'number'
      ? optionsOrDefault
      : optionsOrDefault?.defaultIntervalMonths ?? 6;

  const existingCustomers =
    typeof optionsOrDefault === 'object' && optionsOrDefault?.existingCustomers
      ? optionsOrDefault.existingCustomers
      : [];

  // Determine industry-aware default asset label (eliminating hardcoded 'AC Unit')
  const defaultAssetLabel =
    typeof optionsOrDefault === 'object' && optionsOrDefault?.defaultAssetLabel
      ? optionsOrDefault.defaultAssetLabel
      : typeof optionsOrDefault === 'object' && optionsOrDefault?.category
      ? getCategoryMetadata(optionsOrDefault.category).assetLabel
      : 'Air Conditioner';

  const validRows: ParsedCSVRow[] = [];
  const invalidRows: ParsedCSVRow[] = [];
  const duplicateCSVRows: ParsedCSVRow[] = [];
  const existingCustomerRows: ParsedCSVRow[] = [];

  // Track seen phones inside this CSV for intra-CSV duplicate detection
  const seenPhonesInCSV = new Map<string, number>();

  rows.forEach((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isDuplicateInCSV = false;
    let isExistingCustomer = false;
    let existingCustomerName: string | undefined = undefined;

    const name = (raw[mapping.nameCol] || '').trim();
    if (!name) {
      errors.push('Missing customer name');
    }

    const rawPhone = (raw[mapping.phoneCol] || '').trim();
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (normalizedPhone.length < 10) {
      errors.push('Invalid phone number (must have at least 10 digits)');
    } else {
      // 1. Check duplicate within CSV
      if (seenPhonesInCSV.has(normalizedPhone)) {
        isDuplicateInCSV = true;
        warnings.push(`Duplicate phone in this CSV (matches row ${seenPhonesInCSV.get(normalizedPhone)})`);
      } else {
        seenPhonesInCSV.set(normalizedPhone, idx + 1);
      }

      // 2. Check existing shop customers (active or archived)
      const existingMatch = existingCustomers.find(
        (c) => normalizePhoneNumber(c.phone) === normalizedPhone
      );
      if (existingMatch) {
        isExistingCustomer = true;
        existingCustomerName = existingMatch.name;
        warnings.push(
          `Phone already registered to ${existingMatch.name}${existingMatch.isArchived ? ' (Archived)' : ''}`
        );
      }
    }

    // Default asset label is now category-aware (e.g. 'Water Purifier' for RO, 'Vehicle / Reg No.' for auto)
    const rawAsset = (raw[mapping.assetCol] || '').trim();
    const assetName = rawAsset || defaultAssetLabel;
    let lastServiceDate = normalizeDate(raw[mapping.lastDateCol] || '');
    let nextDueDate = normalizeDate(raw[mapping.nextDateCol] || '');

    // Fallbacks if dates are missing
    if (!lastServiceDate && !nextDueDate) {
      const today = new Date().toISOString().split('T')[0];
      lastServiceDate = today;
      const d = new Date();
      d.setMonth(d.getMonth() + defaultIntervalMonths);
      nextDueDate = d.toISOString().split('T')[0];
    } else if (lastServiceDate && !nextDueDate) {
      const [y, m, d] = lastServiceDate.split('-').map(Number);
      if (y && m && d) {
        const dt = new Date(y, m - 1, d);
        dt.setMonth(dt.getMonth() + defaultIntervalMonths);
        nextDueDate = dt.toISOString().split('T')[0];
      }
    } else if (!lastServiceDate && nextDueDate) {
      lastServiceDate = nextDueDate;
    }

    const rawAmount = (raw[mapping.amountCol] || '1200').replace(/[^0-9.]/g, '');
    const serviceAmount = parseFloat(rawAmount) || 1200;
    const address = (raw[mapping.addressCol] || '').trim();
    const locality = mapping.localityCol ? (raw[mapping.localityCol] || '').trim() || undefined : undefined;
    const city = mapping.cityCol ? (raw[mapping.cityCol] || '').trim() || undefined : undefined;
    const pincode = mapping.pincodeCol ? (raw[mapping.pincodeCol] || '').trim() || undefined : undefined;
    const landmark = mapping.landmarkCol ? (raw[mapping.landmarkCol] || '').trim() || undefined : undefined;

    const parsedRow: ParsedCSVRow = {
      rowIndex: idx + 1,
      raw,
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      isDuplicateInCSV,
      isExistingCustomer,
      existingCustomerName,
      normalized: errors.length === 0 ? {
        name,
        phone: normalizedPhone,
        assetName,
        lastServiceDate,
        nextDueDate,
        serviceAmount,
        address,
        locality,
        city,
        pincode,
        landmark,
      } : undefined,
    };

    if (parsedRow.isValid) {
      validRows.push(parsedRow);
      if (isDuplicateInCSV) {
        duplicateCSVRows.push(parsedRow);
      }
      if (isExistingCustomer) {
        existingCustomerRows.push(parsedRow);
      }
    } else {
      invalidRows.push(parsedRow);
    }
  });

  return { validRows, invalidRows, duplicateCSVRows, existingCustomerRows };
}
