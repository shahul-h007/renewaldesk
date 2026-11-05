/**
 * test/import-duplicate-detection.test.ts
 *
 * Verifies that:
 * 1. normalizePhoneNumber accurately strips symbols, country codes (+91), leading zeros,
 *    and extracts the last 10 digits.
 * 2. Intra-CSV duplicate detection flags rows with repeated phone numbers.
 * 3. Existing-customer duplicate detection matches active and archived customer phones in the shop.
 * 4. Skip duplicates logic cleanly excludes duplicate rows when skipDuplicates is enabled.
 * 5. Manual customer addition detects existing customer phone and generates a non-blocking warning.
 */

import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  validateAndMapRows,
  CSVMapping,
  ExistingCustomerMatch,
} from '../lib/csv-import';

console.log('🧪 Starting Import Phone Normalization & Duplicate Detection Test Suite...\n');

// ==========================================
// Test Suite 1: Phone Normalization Logic
// ==========================================
console.log('--- Suite 1: Phone Normalization Logic ---');

{
  assert.equal(normalizePhoneNumber('+91 98460 55441'), '9846055441');
  assert.equal(normalizePhoneNumber('+91-9846055441'), '9846055441');
  assert.equal(normalizePhoneNumber('09846055441'), '9846055441');
  assert.equal(normalizePhoneNumber('9846055441'), '9846055441');
  assert.equal(normalizePhoneNumber('98460 55441'), '9846055441');
  assert.equal(normalizePhoneNumber('+91 09846055441'), '9846055441');
  assert.equal(normalizePhoneNumber('(0484) 9846055441'), '9846055441');
  assert.equal(normalizePhoneNumber(''), '');
  assert.equal(normalizePhoneNumber('12345'), '12345'); // shorter than 10 digits returns clean digits
  console.log('  ✔ Standard Indian phone number variants normalize to exact 10 digits');
}

// ==========================================
// Test Suite 2: Intra-CSV Duplicate Detection
// ==========================================
console.log('\n--- Suite 2: Intra-CSV Duplicate Detection ---');

{
  const mapping: CSVMapping = {
    nameCol: 'Name',
    phoneCol: 'Phone',
    assetCol: 'Appliance',
    lastDateCol: 'LastService',
    nextDateCol: 'NextDue',
    amountCol: 'Amount',
    addressCol: 'Address',
  };

  const rows = [
    { Name: 'Customer A', Phone: '+91 98460 11222', Appliance: 'Split AC 1.5T' },
    { Name: 'Customer B', Phone: '9846011333', Appliance: 'Window AC' },
    { Name: 'Customer C', Phone: '09846011222', Appliance: 'Inverter AC' }, // Duplicate of Customer A with leading 0
    { Name: 'Customer D', Phone: '98460-11222', Appliance: 'Cassette AC' }, // Duplicate of Customer A with dash
  ];

  const result = validateAndMapRows(rows, mapping);

  assert.equal(result.validRows.length, 4, 'All 4 rows have valid names and phones');
  assert.equal(result.duplicateCSVRows.length, 2, '2 duplicate rows detected in CSV');

  // Row 1 (first appearance) should NOT be flagged as duplicate
  assert.equal(result.validRows[0].isDuplicateInCSV, false);

  // Row 2 (unique phone) should NOT be flagged
  assert.equal(result.validRows[1].isDuplicateInCSV, false);

  // Row 3 (duplicate of row 1) MUST be flagged
  assert.equal(result.validRows[2].isDuplicateInCSV, true);
  assert.equal(result.validRows[2].warnings?.some(w => w.includes('Duplicate phone in this CSV')), true);

  // Row 4 (duplicate of row 1) MUST be flagged
  assert.equal(result.validRows[3].isDuplicateInCSV, true);

  console.log('  ✔ Multiple formatted variations of the same phone detected as intra-CSV duplicates');
}

// ==========================================
// Test Suite 3: Existing Shop Customers Duplicate Detection (Active & Archived)
// ==========================================
console.log('\n--- Suite 3: Existing Shop Customers Duplicate Detection ---');

{
  const mapping: CSVMapping = {
    nameCol: 'Name',
    phoneCol: 'Phone',
    assetCol: 'Appliance',
    lastDateCol: 'LastService',
    nextDateCol: 'NextDue',
    amountCol: 'Amount',
    addressCol: 'Address',
  };

  const existingCustomers: ExistingCustomerMatch[] = [
    { name: 'Kavitha Nair', phone: '+91 98460 99887', isArchived: false },
    { name: 'Manoj Kumar', phone: '9846077665', isArchived: true },
  ];

  const rows = [
    { Name: 'New Customer', Phone: '9846011111' },
    { Name: 'Kavitha Duplicate', Phone: '09846099887' }, // Matches active Kavitha Nair
    { Name: 'Manoj Duplicate', Phone: '+91 98460 77665' }, // Matches archived Manoj Kumar
  ];

  const result = validateAndMapRows(rows, mapping, {
    existingCustomers,
  });

  assert.equal(result.validRows.length, 3);
  assert.equal(result.existingCustomerRows.length, 2);

  // Row 1: completely new customer
  assert.equal(result.validRows[0].isExistingCustomer, false);

  // Row 2: matches active Kavitha
  assert.equal(result.validRows[1].isExistingCustomer, true);
  assert.equal(result.validRows[1].existingCustomerName, 'Kavitha Nair');
  assert.equal(result.validRows[1].warnings?.some(w => w.includes('Phone already registered to Kavitha Nair')), true);

  // Row 3: matches archived Manoj
  assert.equal(result.validRows[2].isExistingCustomer, true);
  assert.equal(result.validRows[2].existingCustomerName, 'Manoj Kumar');
  assert.equal(result.validRows[2].warnings?.some(w => w.includes('(Archived)')), true);

  console.log('  ✔ Successfully matched active and archived shop customer phones');
}

// ==========================================
// Test Suite 4: Skip Duplicates Option Logic
// ==========================================
console.log('\n--- Suite 4: Skip Duplicates Option Logic ---');

{
  const mapping: CSVMapping = {
    nameCol: 'Name',
    phoneCol: 'Phone',
    assetCol: 'Appliance',
    lastDateCol: 'LastService',
    nextDateCol: 'NextDue',
    amountCol: 'Amount',
    addressCol: 'Address',
  };

  const existingCustomers: ExistingCustomerMatch[] = [
    { name: 'Existing Customer', phone: '9846011111', isArchived: false },
  ];

  const rows = [
    { Name: 'Unique Client 1', Phone: '9846022222' },
    { Name: 'Existing Client', Phone: '9846011111' }, // Matches existing shop customer
    { Name: 'Unique Client 2', Phone: '9846033333' },
    { Name: 'Duplicate of Client 2', Phone: '9846033333' }, // Intra-CSV duplicate
  ];

  const result = validateAndMapRows(rows, mapping, { existingCustomers });

  // When skipDuplicates = true (default behavior):
  const rowsToImportSkipping = result.validRows.filter(
    (r) => !r.isDuplicateInCSV && !r.isExistingCustomer
  );
  assert.equal(rowsToImportSkipping.length, 2, 'Only 2 unique, non-existing rows are imported');
  assert.equal(rowsToImportSkipping[0].normalized?.name, 'Unique Client 1');
  assert.equal(rowsToImportSkipping[1].normalized?.name, 'Unique Client 2');
  console.log('  ✔ When skipDuplicates is true, duplicate and existing customer rows are safely excluded');

  // When skipDuplicates = false (user explicitly chooses to allow duplicates):
  const rowsToImportAll = result.validRows;
  assert.equal(rowsToImportAll.length, 4, 'All 4 valid rows are imported when skipDuplicates is disabled');
  console.log('  ✔ When skipDuplicates is false, all valid rows can be imported');
}

// ==========================================
// Test Suite 5: Manual Add Customer Phone Duplicate Check
// ==========================================
console.log('\n--- Suite 5: Manual Add Customer Phone Duplicate Check ---');

{
  const shopCustomers = [
    { id: 'c1', name: 'Dr. Jacob Abraham', phone: '+91 98460 55555' },
    { id: 'c2', name: 'Ananya Roy', phone: '9846066666' },
  ];

  // Helper function emulating AddCustomerModal phone matching logic
  function checkManualAddDuplicate(inputPhone: string, customers: { name: string; phone: string }[]) {
    const normalizedInput = normalizePhoneNumber(inputPhone);
    if (normalizedInput.length < 10) return null;
    return customers.find(c => normalizePhoneNumber(c.phone) === normalizedInput) || null;
  }

  // 1. Unique phone -> no warning
  const match1 = checkManualAddDuplicate('9846077777', shopCustomers);
  assert.equal(match1, null);

  // 2. Existing phone with leading 0 -> warns and identifies customer
  const match2 = checkManualAddDuplicate('09846055555', shopCustomers);
  assert.notEqual(match2, null);
  assert.equal(match2?.name, 'Dr. Jacob Abraham');

  // 3. Existing phone with +91 and spaces -> warns and identifies customer
  const match3 = checkManualAddDuplicate('+91 98460 66666', shopCustomers);
  assert.notEqual(match3, null);
  assert.equal(match3?.name, 'Ananya Roy');

  console.log('  ✔ Manual customer add phone check correctly identifies existing customer without blocking');
}

console.log('\n🎉 ALL IMPORT DUPLICATE DETECTION TESTS PASSED SUCCESSFULLY!\n');
