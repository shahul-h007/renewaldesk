export interface CSVMapping {
  nameCol: string;
  phoneCol: string;
  assetCol: string;
  lastDateCol: string;
  nextDateCol: string;
  amountCol: string;
  addressCol: string;
}

export interface ParsedCSVRow {
  rowIndex: number;
  raw: Record<string, string>;
  isValid: boolean;
  errors: string[];
  normalized?: {
    name: string;
    phone: string;
    assetName: string;
    lastServiceDate: string;
    nextDueDate: string;
    serviceAmount: number;
    address: string;
  };
}

export interface CSVParseResult {
  headers: string[];
  totalRows: number;
  validRows: ParsedCSVRow[];
  invalidRows: ParsedCSVRow[];
  suggestedMapping: CSVMapping;
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

  return {
    nameCol: findMatch(['name', 'customer', 'client']),
    phoneCol: findMatch(['phone', 'mobile', 'contact', 'whatsapp', 'cell', 'tel']),
    assetCol: findMatch(['asset', 'appliance', 'model', 'acmodel', 'device', 'equipment']),
    lastDateCol: findMatch(['lastservice', 'lastdate', 'servicedate', 'previousdate', 'installation']),
    nextDateCol: findMatch(['nextdue', 'duedate', 'nextservice', 'renewaldate']),
    amountCol: findMatch(['amount', 'price', 'fee', 'value', 'charge', 'rate', 'cost']),
    addressCol: findMatch(['address', 'location', 'city', 'area', 'locality']),
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
 * Validates rows against business rules.
 */
export function validateAndMapRows(
  rows: Record<string, string>[],
  mapping: CSVMapping,
  defaultIntervalMonths = 6
): { validRows: ParsedCSVRow[]; invalidRows: ParsedCSVRow[] } {
  const validRows: ParsedCSVRow[] = [];
  const invalidRows: ParsedCSVRow[] = [];

  rows.forEach((raw, idx) => {
    const errors: string[] = [];

    const name = (raw[mapping.nameCol] || '').trim();
    if (!name) {
      errors.push('Missing customer name');
    }

    const rawPhone = (raw[mapping.phoneCol] || '').trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      errors.push('Invalid phone number (must have at least 10 digits)');
    }

    const assetName = (raw[mapping.assetCol] || 'AC Unit').trim();
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
    const address = (raw[mapping.addressCol] || 'Kochi').trim();

    const parsedRow: ParsedCSVRow = {
      rowIndex: idx + 1,
      raw,
      isValid: errors.length === 0,
      errors,
      normalized: errors.length === 0 ? {
        name,
        phone: rawPhone,
        assetName,
        lastServiceDate,
        nextDueDate,
        serviceAmount,
        address,
      } : undefined,
    };

    if (parsedRow.isValid) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
    }
  });

  return { validRows, invalidRows };
}
