/**
 * test/import-asset-fallback.test.ts
 *
 * Verifies that:
 * 1. Missing asset/appliance in CSV rows no longer falls back to hardcoded 'AC Unit'.
 * 2. For Water Purifier / RO shops, empty asset falls back to 'Water Purifier'.
 * 3. For Vehicle Service & Auto Care shops, empty asset falls back to 'Vehicle / Reg No.'.
 * 4. Custom defaultAssetLabel option overrides category default if provided.
 */

import assert from 'node:assert/strict';
import { validateAndMapRows, CSVMapping } from '../lib/csv-import';
import { getCategoryMetadata } from '../lib/catalog-presets';

console.log('🧪 Starting Category-Aware Asset Fallback Test Suite...\n');

const mappingWithoutAsset: CSVMapping = {
  nameCol: 'Name',
  phoneCol: 'Phone',
  assetCol: 'Appliance', // Column does not exist in rows
  lastDateCol: 'LastService',
  nextDateCol: 'NextDue',
  amountCol: 'Amount',
  addressCol: 'Address',
};

// ==========================================
// Test Suite 1: RO Purifier Shop Asset Fallback
// ==========================================
console.log('--- Suite 1: Water Purifier / RO Shop Asset Fallback ---');

{
  const rows: Record<string, string>[] = [
    { Name: 'Priya Sharma', Phone: '9846011111' }, // Missing asset column entirely
    { Name: 'Rahul Varma', Phone: '9846022222', Appliance: '' }, // Blank asset cell
  ];

  // Test with category string
  const result = validateAndMapRows(rows, mappingWithoutAsset, {
    category: 'Water Purifier / RO Service',
  });

  assert.equal(result.validRows.length, 2);
  assert.equal(
    result.validRows[0].normalized?.assetName,
    'Water Purifier',
    'Row 1 without asset column should default to Water Purifier for RO shop'
  );
  assert.equal(
    result.validRows[1].normalized?.assetName,
    'Water Purifier',
    'Row 2 with blank asset cell should default to Water Purifier for RO shop'
  );

  // Test with normalized category key
  const roMeta = getCategoryMetadata('water_purifier');
  assert.equal(roMeta.assetLabel, 'Water Purifier');

  console.log('  ✔ RO shop correctly defaults missing asset to Water Purifier (not AC Unit)');
}

// ==========================================
// Test Suite 2: Vehicle Service & Auto Care Asset Fallback
// ==========================================
console.log('\n--- Suite 2: Vehicle Service & Auto Care Asset Fallback ---');

{
  const rows: Record<string, string>[] = [
    { Name: 'Mathew Joseph', Phone: '9846033333' },
    { Name: 'Sanjay Dutt', Phone: '9846044444', Appliance: '   ' }, // Whitespace only
  ];

  const result = validateAndMapRows(rows, mappingWithoutAsset, {
    category: 'Vehicle Service & Auto Care',
  });

  assert.equal(result.validRows.length, 2);
  assert.equal(
    result.validRows[0].normalized?.assetName,
    'Vehicle / Reg No.',
    'Row 1 should default to Vehicle / Reg No. for vehicle shop'
  );
  assert.equal(
    result.validRows[1].normalized?.assetName,
    'Vehicle / Reg No.',
    'Row 2 with whitespace asset should default to Vehicle / Reg No. for vehicle shop'
  );

  const vehicleMeta = getCategoryMetadata('vehicle_service');
  assert.equal(vehicleMeta.assetLabel, 'Vehicle / Reg No.');

  console.log('  ✔ Vehicle shop correctly defaults missing asset to Vehicle / Reg No. (not AC Unit)');
}

// ==========================================
// Test Suite 3: Explicit Custom Default Asset Label Override
// ==========================================
console.log('\n--- Suite 3: Custom Default Asset Label Override ---');

{
  const rows = [{ Name: 'Custom Client', Phone: '9846055555' }];

  const result = validateAndMapRows(rows, mappingWithoutAsset, {
    defaultAssetLabel: 'CCTV Camera System',
  });

  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].normalized?.assetName, 'CCTV Camera System');
  console.log('  ✔ Explicit defaultAssetLabel option overrides category default');
}

// ==========================================
// Test Suite 4: Real Provided Asset Name is Preserved
// ==========================================
console.log('\n--- Suite 4: Explicit Asset Name in CSV is Always Preserved ---');

{
  const mappingWithAsset: CSVMapping = {
    nameCol: 'Name',
    phoneCol: 'Phone',
    assetCol: 'Appliance',
    lastDateCol: 'LastService',
    nextDateCol: 'NextDue',
    amountCol: 'Amount',
    addressCol: 'Address',
  };

  const rows = [
    { Name: 'Pooja Hegde', Phone: '9846066666', Appliance: 'Kent Grand Plus 8L RO' },
    { Name: 'Vikram Singh', Phone: '9846077777', Appliance: 'Royal Enfield Classic 350' },
  ];

  const resultRO = validateAndMapRows(rows.slice(0, 1), mappingWithAsset, {
    category: 'Water Purifier / RO Service',
  });
  assert.equal(resultRO.validRows[0].normalized?.assetName, 'Kent Grand Plus 8L RO');

  const resultVehicle = validateAndMapRows(rows.slice(1, 2), mappingWithAsset, {
    category: 'Vehicle Service & Auto Care',
  });
  assert.equal(resultVehicle.validRows[0].normalized?.assetName, 'Royal Enfield Classic 350');

  console.log('  ✔ Explicit asset models in CSV are preserved untouched');
}

console.log('\n🎉 ALL ASSET FALLBACK TESTS PASSED SUCCESSFULLY!\n');
