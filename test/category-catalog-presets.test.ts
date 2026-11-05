import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  normalizeCategory,
  getPresetsForCategory,
  getCategoryMetadata,
  getInitialTemplatesForCategory,
  BUSINESS_TYPE_OPTIONS,
  CATEGORY_PRESETS,
  BusinessCategoryKey,
} from '../lib/catalog-presets';

console.log('--- RUNNING BUSINESS-AWARE CATALOG PRESETS TEST SUITE ---');

// 1. Test Category Normalization
console.log('1. Testing category normalization...');
assert.strictEqual(normalizeCategory('Air Conditioning Maintenance'), 'ac');
assert.strictEqual(normalizeCategory('AC Service & Repair'), 'ac');
assert.strictEqual(normalizeCategory('ac'), 'ac');
assert.strictEqual(normalizeCategory('HVAC Chillers'), 'ac');

assert.strictEqual(normalizeCategory('Vehicle Service & Auto Care'), 'vehicle');
assert.strictEqual(normalizeCategory('Car Garage & Auto Repair'), 'vehicle');
assert.strictEqual(normalizeCategory('Motorbike Servicing'), 'vehicle');

assert.strictEqual(normalizeCategory('Pest Control Services'), 'pest_control');
assert.strictEqual(normalizeCategory('Termite and Pest Protection'), 'pest_control');
assert.strictEqual(normalizeCategory('Rodent control'), 'pest_control');

assert.strictEqual(normalizeCategory('RO Water Purifier Service'), 'water_purifier');
assert.strictEqual(normalizeCategory('Water Purifier Maintenance'), 'water_purifier');
assert.strictEqual(normalizeCategory('RO Filter Replacement'), 'water_purifier');

assert.strictEqual(normalizeCategory('Appliance Repair & Maintenance'), 'appliance');
assert.strictEqual(normalizeCategory('Home Cleaning & Deep Wash'), 'cleaning');
assert.strictEqual(normalizeCategory('Solar Panel Maintenance'), 'solar');
assert.strictEqual(normalizeCategory('General Electrical & Plumbing'), 'electrical_plumbing');

// Unknown and edge cases fall back to 'other'
assert.strictEqual(normalizeCategory('Other'), 'other');
assert.strictEqual(normalizeCategory('Custom Business 999'), 'other');
assert.strictEqual(normalizeCategory(''), 'other');
assert.strictEqual(normalizeCategory(null), 'other');
assert.strictEqual(normalizeCategory(undefined), 'other');
console.log('  ✓ Category normalization passes for all supported categories and edge-case fallbacks.');

// 2. Test Presets per Category
console.log('2. Testing service presets per category...');
const categories: BusinessCategoryKey[] = [
  'ac',
  'vehicle',
  'pest_control',
  'water_purifier',
  'appliance',
  'cleaning',
  'solar',
  'electrical_plumbing',
  'other',
];

for (const cat of categories) {
  const presets = getPresetsForCategory(cat);
  assert(presets.length >= 3, `Category ${cat} must provide at least 3 starter services`);

  for (const item of presets) {
    assert(item.id.startsWith(`preset-${cat}-`), `Preset ID ${item.id} should match category prefix`);
    assert(item.name.trim().length > 0, `Preset name cannot be empty for ${cat}`);
    assert(item.intervalValue > 0, `Interval value must be positive for ${item.name}`);
    assert(['DAYS', 'MONTHS', 'YEARS'].includes(item.intervalUnit), `Invalid interval unit for ${item.name}`);
    assert(item.typicalPrice >= 0, `Typical price must be non-negative for ${item.name}`);
    assert.strictEqual(item.isActive, true, `Preset item must default to active`);
  }
}

// 3. Category Separation & AC copy exclusion
console.log('3. Testing that non-AC presets do not contain AC copy...');
const vehiclePresets = getPresetsForCategory('vehicle');
const vehicleNames = vehiclePresets.map((s) => s.name.toLowerCase()).join(' ');
assert(!vehicleNames.includes('ac '), 'Vehicle presets must not mention AC');
assert(!vehicleNames.includes('compressor'), 'Vehicle presets must not mention compressor');
assert(vehicleNames.includes('oil'), 'Vehicle presets should include oil change');
assert(vehicleNames.includes('brake'), 'Vehicle presets should include brake inspection');

const pestPresets = getPresetsForCategory('pest_control');
const pestNames = pestPresets.map((s) => s.name.toLowerCase()).join(' ');
assert(!pestNames.includes('ac '), 'Pest presets must not mention AC');
assert(!pestNames.includes('freon'), 'Pest presets must not mention freon');
assert(pestNames.includes('termite'), 'Pest presets should include termite protection');
assert(pestNames.includes('pest'), 'Pest presets should include pest control');

const purifierPresets = getPresetsForCategory('water_purifier');
const purifierNames = purifierPresets.map((s) => s.name.toLowerCase()).join(' ');
assert(!purifierNames.includes('ac '), 'Water purifier presets must not mention AC');
assert(purifierNames.includes('filter'), 'Water purifier presets should include filter replacement');
assert(purifierNames.includes('ro membrane'), 'Water purifier presets should include RO membrane');

const otherPresets = getPresetsForCategory('other');
const otherNames = otherPresets.map((s) => s.name.toLowerCase()).join(' ');
assert(!otherNames.includes('ac '), 'Other presets must not mention AC');
assert(!otherNames.includes('cooling'), 'Other presets must not mention cooling');
assert(otherNames.includes('routine service'), 'Other presets should include routine service');
console.log('  ✓ Category-specific service isolation verified.');

// 4. Test Category Metadata & Dynamic Asset Labels
console.log('4. Testing category metadata and asset labels...');
const vehicleMeta = getCategoryMetadata('Vehicle Service & Auto Care');
assert.strictEqual(vehicleMeta.assetLabel, 'Vehicle / Reg No.');
assert(vehicleMeta.assetPlaceholder.toLowerCase().includes('creta') || vehicleMeta.assetPlaceholder.toLowerCase().includes('vehicle'));

const pestMeta = getCategoryMetadata('Pest Control Services');
assert.strictEqual(pestMeta.assetLabel, 'Property / Premises');

const acMeta = getCategoryMetadata('Air Conditioning Maintenance');
assert.strictEqual(acMeta.assetLabel, 'Air Conditioner');

const otherMeta = getCategoryMetadata('Other');
assert.strictEqual(otherMeta.assetLabel, 'Asset / Equipment');
console.log('  ✓ Category metadata and dynamic asset labels verified.');

// 5. Test Starter WhatsApp Templates per Category
console.log('5. Testing category starter WhatsApp templates...');
for (const cat of categories) {
  const templates = getInitialTemplatesForCategory(cat);
  assert.strictEqual(templates.length, 5, `Category ${cat} must provide exactly 5 lifecycle templates`);
  const types = templates.map((t) => t.type);
  assert(types.includes('DUE_SOON'), 'Must include DUE_SOON');
  assert(types.includes('DUE_TODAY'), 'Must include DUE_TODAY');
  assert(types.includes('OVERDUE'), 'Must include OVERDUE');
  assert(types.includes('BOOKING_CONFIRMATION'), 'Must include BOOKING_CONFIRMATION');
  assert(types.includes('SERVICE_COMPLETED'), 'Must include SERVICE_COMPLETED');

  if (cat !== 'ac') {
    const allText = templates.map((t) => t.templateText.toLowerCase()).join(' ');
    assert(!allText.includes('compressor breakdown'), `${cat} templates must not mention compressor breakdown`);
    assert(!allText.includes('cooling loss'), `${cat} templates must not mention cooling loss`);
  }
}
console.log('  ✓ Category-aware starter templates verified without hardcoded AC defaults.');

// 6. Test Migration File Structure & Constraints
console.log('6. Verifying migration SQL file...');
const migrationPath = path.join(__dirname, '../supabase/migrations/20261020_business_services_and_templates.sql');
assert(fs.existsSync(migrationPath), `Migration file must exist at ${migrationPath}`);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(migrationSql.includes('ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT'), 'Must add city column');
assert(migrationSql.includes('ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pincode TEXT'), 'Must add pincode column');
assert(migrationSql.includes('ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS landmark TEXT'), 'Must add landmark column');

assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.create_business_and_owner'), 'Must define create_business_and_owner');
assert(migrationSql.includes('p_name TEXT'), 'Preserve p_name');
assert(migrationSql.includes("p_business_type TEXT DEFAULT 'Air Conditioning Maintenance'"), 'Preserve p_business_type');
assert(migrationSql.includes("p_phone TEXT DEFAULT ''"), 'Preserve p_phone');
assert(migrationSql.includes("p_city TEXT DEFAULT 'Kochi'"), 'Preserve p_city');
assert(migrationSql.includes("p_timezone TEXT DEFAULT 'Asia/Kolkata'"), 'Preserve p_timezone');
assert(migrationSql.includes("p_currency TEXT DEFAULT '₹'"), 'Preserve p_currency');

assert(migrationSql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
assert(migrationSql.includes('SET search_path = public'), 'Must set search_path = public');
assert(migrationSql.includes("v_user_id := auth.uid()"), 'Must require auth.uid()');

// Check category branching in SQL
assert(migrationSql.includes('%vehicle%'), 'SQL must branch on vehicle');
assert(migrationSql.includes('%pest%'), 'SQL must branch on pest');
assert(migrationSql.includes('%purifier%'), 'SQL must branch on purifier');
assert(migrationSql.includes('ON CONFLICT DO NOTHING'), 'SQL must prevent duplicate inserts');
assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.create_business_and_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated'), 'Grant execution permission');
console.log('  ✓ Migration file verification passed.');

console.log('\n--- ALL BUSINESS-AWARE CATALOG PRESETS TESTS PASSED ---');
