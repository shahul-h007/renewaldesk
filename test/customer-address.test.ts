import assert from 'node:assert';
import {
  formatCustomerAddress,
  formatAddressSummary,
  hasSufficientAddress,
  getGoogleMapsSearchUrl,
  copyToClipboard,
} from '../lib/address-utils';
import { Customer } from '../lib/types';
import { DbCustomer } from '../lib/db/types';
import { mapDbCustomerToApp } from '../lib/db/operations';
import { parseCSVText, guessMapping, validateAndMapRows, CSVMapping } from '../lib/csv-import';

async function main() {
  console.log('Running Customer Address Usability Test Suite...\n');

// ============================================================
// 1. Address Formatting Tests (Single-line, Multiline & Cleanliness)
// ============================================================
console.log('--- 1. Address Formatting Tests ---');

// Full address
const fullCustomer: Partial<Customer> = {
  address: 'Flat 4B, SkyLine Ivy Apartments',
  landmark: 'Near Lulu Mall',
  locality: 'Edappally',
  city: 'Kochi',
  pincode: '682024',
};

const fullFormatted = formatCustomerAddress(fullCustomer);
assert.ok(fullFormatted.includes('Flat 4B, SkyLine Ivy Apartments'), 'Contains street address');
assert.ok(fullFormatted.includes('Near Lulu Mall'), 'Contains landmark');
assert.ok(fullFormatted.includes('Edappally'), 'Contains locality');
assert.ok(fullFormatted.includes('Kochi'), 'Contains city');
assert.ok(fullFormatted.includes('682024'), 'Contains pincode');
assert.ok(!fullFormatted.includes(',,'), 'No duplicate commas in full address');
assert.ok(!fullFormatted.includes('undefined'), 'No "undefined" string');
assert.ok(!fullFormatted.includes('null'), 'No "null" string');
console.log('  ✔ Full address formats cleanly into single-line without duplicate commas');

// Multiline address
const multilineFormatted = formatCustomerAddress(fullCustomer, { multiline: true });
const lines = multilineFormatted.split('\n');
assert.strictEqual(lines[0], 'Flat 4B, SkyLine Ivy Apartments');
assert.strictEqual(lines[1], 'Near Lulu Mall');
assert.strictEqual(lines[2], 'Edappally, Kochi - 682024');
console.log('  ✔ Multiline address formats with clear line breaks');

// Partial address - only city and pincode
const partialCustomer1: Partial<Customer> = {
  city: 'Kochi',
  pincode: '682001',
};
assert.strictEqual(formatCustomerAddress(partialCustomer1), 'Kochi, 682001');
console.log('  ✔ Partial address (city + pincode only) formats correctly');

// Partial address - only locality
const partialCustomer2: Partial<Customer> = {
  locality: 'Kaloor',
};
assert.strictEqual(formatCustomerAddress(partialCustomer2), 'Kaloor');
console.log('  ✔ Partial address (locality only) formats correctly');

// Empty or whitespace-only address
assert.strictEqual(formatCustomerAddress({}), '', 'Empty object returns empty string');
assert.strictEqual(formatCustomerAddress(null), '', 'Null customer returns empty string');
assert.strictEqual(
  formatCustomerAddress({ address: '   ', city: '', locality: '  ' }),
  '',
  'Whitespace fields return empty string'
);
console.log('  ✔ Empty and whitespace fields produce clean empty strings');

// Dirty inputs with "undefined", "null", trailing commas
const dirtyCustomer: Partial<Customer> = {
  address: 'Door 10, Main St, , ',
  landmark: 'undefined',
  locality: 'Panampilly Nagar,',
  city: 'null',
  pincode: ' 682036 ',
};
const dirtyFormatted = formatCustomerAddress(dirtyCustomer);
assert.ok(!dirtyFormatted.includes('undefined'), 'Strips string literal "undefined"');
assert.ok(!dirtyFormatted.includes('null'), 'Strips string literal "null"');
assert.ok(!dirtyFormatted.includes(',,'), 'No double commas from dirty input');
assert.ok(dirtyFormatted.includes('Door 10, Main St'), 'Preserves valid address');
assert.ok(dirtyFormatted.includes('Panampilly Nagar'), 'Preserves valid locality');
assert.ok(dirtyFormatted.includes('682036'), 'Preserves valid pincode');
console.log('  ✔ Sanitizes dirty inputs, trailing commas, and literal undefined/null');

// ============================================================
// 2. Address Summary Tests
// ============================================================
console.log('\n--- 2. Address Summary Tests ---');

assert.strictEqual(
  formatAddressSummary({ locality: 'Edappally', city: 'Kochi' }),
  'Edappally, Kochi'
);
assert.strictEqual(
  formatAddressSummary({ locality: 'Fort Kochi', city: 'Kochi' }),
  'Fort Kochi',
  'Does not repeat Kochi if already in locality'
);
assert.strictEqual(
  formatAddressSummary({ address: 'Flat 12B, Skyline' }),
  'Flat 12B, Skyline',
  'Falls back to address if locality and city are missing'
);
assert.strictEqual(formatAddressSummary({}), '', 'Returns empty string if all empty');
console.log('  ✔ formatAddressSummary generates clean previews for list cards');

// ============================================================
// 3. Sufficient Address Check & Google Maps URL Generation
// ============================================================
console.log('\n--- 3. Google Maps URL Generation Tests ---');

assert.strictEqual(hasSufficientAddress(null), false);
assert.strictEqual(hasSufficientAddress({}), false);
assert.strictEqual(hasSufficientAddress({ address: '  ', city: '' }), false);
assert.strictEqual(hasSufficientAddress({ city: 'Kochi' }), true);
assert.strictEqual(hasSufficientAddress({ locality: 'Edappally' }), true);
assert.strictEqual(hasSufficientAddress({ address: 'Flat 4B' }), true);
assert.strictEqual(hasSufficientAddress({ landmark: 'Near Metro Pillar 40' }), true);
console.log('  ✔ hasSufficientAddress correctly detects whether address data is usable');

// Search URL generation
const mapsUrl = getGoogleMapsSearchUrl(fullCustomer);
assert.ok(mapsUrl !== null, 'Maps URL is generated for full customer');
assert.ok(mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='), 'Uses standard Google Maps search API');
assert.ok(mapsUrl.includes(encodeURIComponent('Flat 4B, SkyLine Ivy Apartments')), 'Correctly URL-encodes address query');
assert.ok(mapsUrl.includes(encodeURIComponent('Edappally')), 'Includes encoded locality');
assert.ok(!mapsUrl.includes('@'), 'Does not invent fake coordinates');

// Insufficient address returns null
assert.strictEqual(getGoogleMapsSearchUrl({}), null, 'Returns null when address is empty');
assert.strictEqual(getGoogleMapsSearchUrl({ address: '   ' }), null, 'Returns null when address is whitespace');
console.log('  ✔ getGoogleMapsSearchUrl builds standard, correctly encoded search URLs without fake coordinates');

// ============================================================
// 4. Safe Clipboard Copying Tests
// ============================================================
console.log('\n--- 4. Clipboard Copy Tests ---');

async function testClipboard() {
  const emptyRes = await copyToClipboard('');
  assert.strictEqual(emptyRes.success, false);
  assert.ok(emptyRes.error?.includes('No address text'));

  const whitespaceRes = await copyToClipboard('   ');
  assert.strictEqual(whitespaceRes.success, false);
  console.log('  ✔ copyToClipboard rejects empty strings without throwing');
}
await testClipboard();

// ============================================================
// 5. Database Mapping & Persistence Roundtrip
// ============================================================
console.log('\n--- 5. Database Mapping & Persistence Tests ---');

const dbCustomerFull: DbCustomer = {
  id: 'cust-abc-123',
  business_id: 'biz-test',
  name: 'Ananya Sharma',
  phone: '9846011223',
  email: 'ananya@example.com',
  address: 'Building 14, Infopark Road',
  locality: 'Kakkanad',
  city: 'Kochi',
  pincode: '682030',
  landmark: 'Opposite SmartCity Gate 2',
  notes: 'Customer prefers evening visits',
  source: 'MANUAL',
  created_at: '2026-04-10T10:00:00Z',
  updated_at: '2026-04-10T10:00:00Z',
  archived_at: null,
};

const mappedCustomer = mapDbCustomerToApp(dbCustomerFull);
assert.strictEqual(mappedCustomer.id, 'cust-abc-123');
assert.strictEqual(mappedCustomer.name, 'Ananya Sharma');
assert.strictEqual(mappedCustomer.address, 'Building 14, Infopark Road');
assert.strictEqual(mappedCustomer.locality, 'Kakkanad');
assert.strictEqual(mappedCustomer.city, 'Kochi');
assert.strictEqual(mappedCustomer.pincode, '682030');
assert.strictEqual(mappedCustomer.landmark, 'Opposite SmartCity Gate 2');
assert.strictEqual(mappedCustomer.createdAt, '2026-04-10');
console.log('  ✔ mapDbCustomerToApp maps full address fields correctly');

// Partial DB customer with nulls
const dbCustomerPartial: DbCustomer = {
  id: 'cust-abc-456',
  business_id: 'biz-test',
  name: 'Rahul Nair',
  phone: '9846099887',
  email: null,
  address: null,
  locality: null,
  city: null,
  pincode: null,
  landmark: null,
  notes: null,
  source: null,
  created_at: '2026-04-15T08:00:00Z',
  updated_at: '2026-04-15T08:00:00Z',
  archived_at: null,
};

const mappedPartial = mapDbCustomerToApp(dbCustomerPartial);
assert.strictEqual(mappedPartial.address, '');
assert.strictEqual(mappedPartial.locality, undefined);
assert.strictEqual(mappedPartial.city, undefined);
assert.strictEqual(mappedPartial.pincode, undefined);
assert.strictEqual(mappedPartial.landmark, undefined);
assert.strictEqual(mappedPartial.email, undefined);
console.log('  ✔ mapDbCustomerToApp handles null fields gracefully');

// ============================================================
// 6. CSV Import Mapping With and Without Extended Address Columns
// ============================================================
console.log('\n--- 6. CSV Import Address Parsing Tests ---');

// CSV With full address columns
const csvWithFullAddress = `Customer Name,Mobile,Appliance Model,Last Service,Next Due Date,Fee,Address,Locality,City,PIN Code,Landmark
Divya Ramesh,9846077889,LG Inverter 1.5T,2026-01-10,2026-07-10,1400,Flat 5C Trinity,Edappally,Kochi,682024,Near Lulu
Aditya Varma,9847111222,Daikin 2T,2026-02-15,2026-08-15,1600,Door 4/20,Kaloor,Kochi,682017,Near Stadium`;

const parsed1 = parseCSVText(csvWithFullAddress);
assert.strictEqual(parsed1.rows.length, 2);

const guessed1 = guessMapping(parsed1.headers);
assert.strictEqual(guessed1.nameCol, 'Customer Name');
assert.strictEqual(guessed1.phoneCol, 'Mobile');
assert.strictEqual(guessed1.addressCol, 'Address');
assert.strictEqual(guessed1.localityCol, 'Locality');
assert.strictEqual(guessed1.cityCol, 'City');
assert.strictEqual(guessed1.pincodeCol, 'PIN Code');
assert.strictEqual(guessed1.landmarkCol, 'Landmark');
console.log('  ✔ guessMapping successfully identifies full address headers');

const validation1 = validateAndMapRows(parsed1.rows, guessed1);
assert.strictEqual(validation1.validRows.length, 2);
assert.strictEqual(validation1.invalidRows.length, 0);

const row1Norm = validation1.validRows[0].normalized!;
assert.strictEqual(row1Norm.name, 'Divya Ramesh');
assert.strictEqual(row1Norm.address, 'Flat 5C Trinity');
assert.strictEqual(row1Norm.locality, 'Edappally');
assert.strictEqual(row1Norm.city, 'Kochi');
assert.strictEqual(row1Norm.pincode, '682024');
assert.strictEqual(row1Norm.landmark, 'Near Lulu');
console.log('  ✔ CSV with full address columns normalizes all address fields');

// CSV with legacy single Locality column (no city/pincode/landmark)
const csvLegacy = `Customer Name,Mobile,Fee,Locality
Sanjay Pillai,9946012345,1200,Palarivattom`;

const parsedLegacy = parseCSVText(csvLegacy);
const guessedLegacy = guessMapping(parsedLegacy.headers);
const validationLegacy = validateAndMapRows(parsedLegacy.rows, guessedLegacy);
assert.strictEqual(validationLegacy.validRows.length, 1);
const legacyNorm = validationLegacy.validRows[0].normalized!;
assert.strictEqual(legacyNorm.name, 'Sanjay Pillai');
assert.strictEqual(legacyNorm.address, 'Palarivattom');
assert.strictEqual(legacyNorm.city, undefined);
assert.strictEqual(legacyNorm.pincode, undefined);
assert.strictEqual(legacyNorm.landmark, undefined);
console.log('  ✔ CSV with legacy columns imports safely without crash');

// CSV without any address column at all
const csvNoAddress = `Customer Name,Mobile,Fee
Harish Kumar,9846333444,1200`;

const parsedNoAddress = parseCSVText(csvNoAddress);
const guessedNoAddress = guessMapping(parsedNoAddress.headers);
const validationNoAddress = validateAndMapRows(parsedNoAddress.rows, guessedNoAddress);
assert.strictEqual(validationNoAddress.validRows.length, 1);
const noAddrNorm = validationNoAddress.validRows[0].normalized!;
assert.strictEqual(noAddrNorm.name, 'Harish Kumar');
assert.strictEqual(noAddrNorm.address, '');
assert.strictEqual(noAddrNorm.locality, undefined);
assert.strictEqual(noAddrNorm.city, undefined);
console.log('  ✔ CSV without address column normalizes gracefully without errors');

  console.log('\nAll Customer Address Usability tests PASSED successfully!\n');
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
