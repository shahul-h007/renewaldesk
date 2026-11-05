import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import {
  BUSINESS_TYPE_OPTIONS,
  getCanonicalCategoryLabel,
  CATEGORY_PRESETS,
} from '../lib/catalog-presets';

// Load .env.local into process.env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    process.env[key] = val;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function runAuditTests() {
  console.log('================================================================');
  console.log('   RENEWALDESK: SETTINGS INDUSTRY & MULTI-TENANT AUDIT TEST');
  console.log('================================================================\n');

  // =====================================================================
  // SUITE 1: Canonical Category Mapping & Form Options Verification
  // =====================================================================
  console.log('--- SUITE 1: Canonical Category Mapping & Form Options Verification ---');

  // Verify all 9 options are present
  assert.strictEqual(BUSINESS_TYPE_OPTIONS.length, 9, 'Must have exactly 9 canonical business categories');
  console.log(`  ✔ Verified ${BUSINESS_TYPE_OPTIONS.length} canonical business categories`);

  // Verify Vehicle Service & Auto Care
  assert(BUSINESS_TYPE_OPTIONS.includes('Vehicle Service & Auto Care'));
  assert.strictEqual(
    getCanonicalCategoryLabel('Vehicle Service & Auto Care'),
    'Vehicle Service & Auto Care'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('vehicle'),
    'Vehicle Service & Auto Care'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('auto'),
    'Vehicle Service & Auto Care'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('Automobile Repair & Service'),
    'Vehicle Service & Auto Care'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('Bike Service'),
    'Vehicle Service & Auto Care'
  );

  // Legacy mappings
  assert.strictEqual(
    getCanonicalCategoryLabel('Home Appliance Repair'),
    'Appliance Repair & Maintenance'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('appliance'),
    'Appliance Repair & Maintenance'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('ac'),
    'Air Conditioning Maintenance'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('pest_control'),
    'Pest Control Services'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('water_purifier'),
    'RO Water Purifier Service'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('cleaning'),
    'Home Cleaning & Deep Wash'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('solar'),
    'Solar Panel Maintenance'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('electrical_plumbing'),
    'General Electrical & Plumbing'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel('other'),
    'Other'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel(''),
    'Air Conditioning Maintenance',
    'Fallback for empty string must be canonical default'
  );
  assert.strictEqual(
    getCanonicalCategoryLabel(null),
    'Air Conditioning Maintenance',
    'Fallback for null must be canonical default'
  );
  console.log('  ✔ All canonical category normalizations pass perfectly');

  // =====================================================================
  // SUITE 2: Live Supabase Settings Persistence & Tenant Isolation
  // =====================================================================
  console.log('\n--- SUITE 2: Live Supabase Settings Persistence & Tenant Isolation ---');
  console.log(`Target URL: ${supabaseUrl}`);

  const timestamp = Date.now();
  const userAEmail = `re.owner.${timestamp}@renewaldesk.local`;
  const userBEmail = `apex.owner.${timestamp}@renewaldesk.local`;
  const testPassword = `RD-AuditTest!${timestamp}#9`;

  const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  let businessAId: string | null = null;
  let businessBId: string | null = null;

  try {
    // 1. Sign up Tenant A (Vehicle Service - "Royal Enfield Showroom")
    const { data: authA, error: authAErr } = await clientA.auth.signUp({
      email: userAEmail,
      password: testPassword,
    });
    if (authAErr) throw new Error(`User A signup failed: ${authAErr.message}`);
    console.log(`  ✔ User A signed up: ${authA.user?.id}`);

    const { data: bizAData, error: bizAErr } = await clientA.rpc('create_business_and_owner', {
      p_name: `Royal Enfield Showroom & Service ${timestamp}`,
      p_business_type: 'Vehicle Service & Auto Care',
      p_phone: '+91 98460 11000',
      p_city: 'Kochi',
      p_timezone: 'Asia/Kolkata',
      p_currency: '₹',
    });
    if (bizAErr) throw new Error(`Tenant A creation failed: ${bizAErr.message}`);
    businessAId = bizAData.id;
    console.log(`  ✔ Tenant A created: ${businessAId} ("Vehicle Service & Auto Care")`);

    // Verify stored business_type in database
    const { data: rawBizA, error: rawBizAErr } = await clientA
      .from('businesses')
      .select('id, name, business_type, phone, address')
      .eq('id', businessAId)
      .single();
    if (rawBizAErr) throw rawBizAErr;
    assert.strictEqual(
      rawBizA.business_type,
      'Vehicle Service & Auto Care',
      'Database must store exact canonical business_type'
    );
    console.log(`  ✔ Confirmed public.businesses.business_type in DB is: "${rawBizA.business_type}"`);

    // Verify reading with getCanonicalCategoryLabel preserves canonical format
    const resolvedLabel = getCanonicalCategoryLabel(rawBizA.business_type);
    assert.strictEqual(
      resolvedLabel,
      'Vehicle Service & Auto Care',
      'getCanonicalCategoryLabel must return exact "Vehicle Service & Auto Care"'
    );
    console.log(`  ✔ Resolved category label for UI: "${resolvedLabel}"`);

    // Test updating Settings via authenticated client
    const canonicalUpdatedCategory = getCanonicalCategoryLabel('Vehicle Service & Auto Care');
    const { error: updBizErr } = await clientA
      .from('businesses')
      .update({
        name: `Royal Enfield Service Centre ${timestamp}`,
        phone: '+91 98460 11999',
        address: 'Ernakulam Central',
        business_type: canonicalUpdatedCategory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessAId);
    if (updBizErr) throw updBizErr;

    const { data: updatedBizA } = await clientA
      .from('businesses')
      .select('id, name, business_type, address')
      .eq('id', businessAId)
      .single();
    assert.strictEqual(
      updatedBizA?.business_type,
      'Vehicle Service & Auto Care',
      'Business update must preserve canonical industry vertical'
    );
    assert.strictEqual(updatedBizA?.address, 'Ernakulam Central');
    console.log('  ✔ Business profile update verified: persists canonical category and address correctly');

    // 2. Sign up Tenant B (Air Conditioning Maintenance - "Apex Air Conditioning")
    const { data: authB, error: authBErr } = await clientB.auth.signUp({
      email: userBEmail,
      password: testPassword,
    });
    if (authBErr) throw new Error(`User B signup failed: ${authBErr.message}`);
    console.log(`  ✔ User B signed up: ${authB.user?.id}`);

    const { data: bizBData, error: bizBErr } = await clientB.rpc('create_business_and_owner', {
      p_name: `Apex Air Conditioning ${timestamp}`,
      p_business_type: 'Air Conditioning Maintenance',
      p_phone: '+91 98460 22000',
      p_city: 'Kochi',
      p_timezone: 'Asia/Kolkata',
      p_currency: '₹',
    });
    if (bizBErr) throw new Error(`Tenant B creation failed: ${bizBErr.message}`);
    businessBId = bizBData.id;
    console.log(`  ✔ Tenant B created: ${businessBId} ("Air Conditioning Maintenance")`);

    // =====================================================================
    // SUITE 3: Multi-Tenant Customer Data Isolation & Duplicate Phone Test
    // =====================================================================
    console.log('\n--- SUITE 3: Multi-Tenant Customer Isolation & Cross-Tenant Security ---');

    const duplicateCustomerPhone = '9846011222';
    const duplicateCustomerName = 'Anand Menon';
    const sharedAddress = 'Flat 4B, Skyview Towers, Marine Drive';

    // Tenant A adds Anand Menon (for Royal Enfield vehicle service)
    const { data: custRowA, error: custAErr } = await clientA
      .from('customers')
      .insert({
        business_id: businessAId,
        name: duplicateCustomerName,
        phone: duplicateCustomerPhone,
        address: sharedAddress,
        locality: 'Marine Drive',
        city: 'Kochi',
        pincode: '682031',
      })
      .select()
      .single();
    if (custAErr) throw custAErr;
    assert(custRowA?.id, 'Tenant A customer must be created');
    console.log(`  ✔ Tenant A created customer: ${custRowA.id} (${duplicateCustomerName}, Phone: ${duplicateCustomerPhone})`);

    // Tenant B adds the SAME Anand Menon with the SAME phone number (for AC service)
    const { data: custRowB, error: custBErr } = await clientB
      .from('customers')
      .insert({
        business_id: businessBId,
        name: duplicateCustomerName,
        phone: duplicateCustomerPhone,
        address: sharedAddress,
        locality: 'Marine Drive',
        city: 'Kochi',
        pincode: '682031',
      })
      .select()
      .single();
    if (custBErr) throw custBErr;
    assert(custRowB?.id, 'Tenant B customer must be created');
    console.log(`  ✔ Tenant B created customer: ${custRowB.id} (${duplicateCustomerName}, Phone: ${duplicateCustomerPhone})`);

    // 1. Verify Distinct Customer IDs and Business IDs
    assert.notStrictEqual(
      custRowA.id,
      custRowB.id,
      'Customer IDs across different tenants must be completely distinct'
    );
    assert.strictEqual(custRowA.business_id, businessAId);
    assert.strictEqual(custRowB.business_id, businessBId);
    console.log('  ✔ Confirmed: Identical phone and name stored in both tenants with distinct UUIDs and isolated business_ids');

    // 2. Verify Query Isolation (Tenant A sees ONLY Tenant A; Tenant B sees ONLY Tenant B)
    const { data: tenantACustomers, error: qAErr } = await clientA
      .from('customers')
      .select('id, name, phone, business_id');
    if (qAErr) throw qAErr;
    assert.strictEqual(tenantACustomers.length, 1);
    assert.strictEqual(tenantACustomers[0].id, custRowA.id);
    assert.strictEqual(tenantACustomers[0].business_id, businessAId);
    console.log('  ✔ Tenant A customer query returns ONLY Tenant A customer (1 row)');

    const { data: tenantBCustomers, error: qBErr } = await clientB
      .from('customers')
      .select('id, name, phone, business_id');
    if (qBErr) throw qBErr;
    assert.strictEqual(tenantBCustomers.length, 1);
    assert.strictEqual(tenantBCustomers[0].id, custRowB.id);
    assert.strictEqual(tenantBCustomers[0].business_id, businessBId);
    console.log('  ✔ Tenant B customer query returns ONLY Tenant B customer (1 row)');

    // 3. Verify Cross-Tenant Read Protection
    // Tenant A queries specifically for Tenant B's customer ID
    const { data: unauthorizedReadA } = await clientA
      .from('customers')
      .select('*')
      .eq('id', custRowB.id);
    assert.strictEqual(
      unauthorizedReadA?.length,
      0,
      'Tenant A must NEVER be able to read Tenant B customer row'
    );
    console.log('  ✔ Cross-tenant READ attempt by Tenant A on Tenant B customer returned 0 rows (denied)');

    // Tenant B queries specifically for Tenant A's customer ID
    const { data: unauthorizedReadB } = await clientB
      .from('customers')
      .select('*')
      .eq('id', custRowA.id);
    assert.strictEqual(
      unauthorizedReadB?.length,
      0,
      'Tenant B must NEVER be able to read Tenant A customer row'
    );
    console.log('  ✔ Cross-tenant READ attempt by Tenant B on Tenant A customer returned 0 rows (denied)');

    // 4. Verify Cross-Tenant Update Protection
    const { data: unauthorizedUpdateA } = await clientA
      .from('customers')
      .update({ name: 'Tampered By Tenant A' })
      .eq('id', custRowB.id)
      .select();
    assert.strictEqual(
      unauthorizedUpdateA?.length || 0,
      0,
      'Tenant A must NEVER be able to update Tenant B customer row'
    );

    // Verify Tenant B's data remains untouched
    const { data: verifyCustB } = await clientB
      .from('customers')
      .select('id, name')
      .eq('id', custRowB.id)
      .single();
    assert.strictEqual(verifyCustB?.name, duplicateCustomerName);
    console.log('  ✔ Cross-tenant UPDATE attempt by Tenant A on Tenant B customer blocked; data intact');

    // 5. Verify Cross-Tenant Delete Protection
    const { data: unauthorizedDeleteA } = await clientA
      .from('customers')
      .delete()
      .eq('id', custRowB.id)
      .select();
    assert.strictEqual(
      unauthorizedDeleteA?.length || 0,
      0,
      'Tenant A must NEVER be able to delete Tenant B customer row'
    );

    // Verify Tenant B's row is still present
    const { data: verifyCustBStillExists } = await clientB
      .from('customers')
      .select('id')
      .eq('id', custRowB.id)
      .single();
    assert(verifyCustBStillExists?.id, 'Tenant B customer must remain untouched after delete attempt');
    console.log('  ✔ Cross-tenant DELETE attempt by Tenant A on Tenant B customer blocked; record preserved');

    // 6. Verify Direct Foreign Tenant Insertion Protection
    const { error: unauthorizedInsertErr } = await clientA
      .from('customers')
      .insert({
        business_id: businessBId, // attempting to insert into Tenant B's workspace
        name: 'Injected Attacker Record',
        phone: '9999900000',
      });
    assert(
      unauthorizedInsertErr,
      'RLS must block inserting a record with a foreign business_id'
    );
    console.log(`  ✔ Direct foreign tenant INSERT attempt correctly rejected with error: "${unauthorizedInsertErr.message}"`);

    console.log('\n================================================================');
    console.log('   ALL SETTINGS & MULTI-TENANT ISOLATION TESTS PASSED (100%)');
    console.log('================================================================');
  } finally {
    // Clean up test workspaces in reverse dependency order
    console.log('\n--- Safe Cleanup of Test Workspaces ---');
    for (const [client, bId, label] of [
      [clientA, businessAId, 'Tenant A (Royal Enfield)'],
      [clientB, businessBId, 'Tenant B (Apex AC)'],
    ] as const) {
      if (bId) {
        try {
          await client.from('reminders').delete().eq('business_id', bId);
          await client.from('service_schedules').delete().eq('business_id', bId);
          await client.from('service_records').delete().eq('business_id', bId);
          await client.from('assets').delete().eq('business_id', bId);
          await client.from('customers').delete().eq('business_id', bId);
          await client.from('message_templates').delete().eq('business_id', bId);
          await client.from('service_types').delete().eq('business_id', bId);
          await client.from('activities').delete().eq('business_id', bId);
          await client.from('businesses').delete().eq('id', bId);
          console.log(`  ✔ Cleaned up test workspace ${label}`);
        } catch (e: any) {
          console.warn(`  Cleanup warning for ${label}:`, e?.message);
        }
      }
    }
    await clientA.auth.signOut();
    await clientB.auth.signOut();
    console.log('  ✔ Test sessions terminated.');
  }
}

runAuditTests().catch((err) => {
  console.error('\n❌ AUDIT TEST FAILED:', err);
  process.exit(1);
});
