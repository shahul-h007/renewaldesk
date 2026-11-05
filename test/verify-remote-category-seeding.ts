import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const url = env['NEXT_PUBLIC_SUPABASE_URL']!;
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;
const supabase = createClient(url, anonKey);

const TEST_CATEGORIES = [
  {
    category: 'Vehicle Service & Auto Care',
    expectedServiceKeyword: 'vehicle',
    prohibitedKeywords: ['air conditioning', 'ac periodic', 'cooling', 'compressor'],
  },
  {
    category: 'Pest Control Services',
    expectedServiceKeyword: 'pest',
    prohibitedKeywords: ['air conditioning', 'ac periodic', 'cooling', 'compressor'],
  },
  {
    category: 'RO Water Purifier Service',
    expectedServiceKeyword: 'filter',
    prohibitedKeywords: ['air conditioning', 'ac periodic', 'cooling', 'compressor'],
  },
  {
    category: 'Appliance Repair & Maintenance',
    expectedServiceKeyword: 'appliance',
    prohibitedKeywords: ['air conditioning', 'ac periodic', 'cooling loss', 'compressor breakdown'],
  },
  {
    category: 'Other',
    expectedServiceKeyword: 'routine service',
    prohibitedKeywords: ['air conditioning', 'ac periodic', 'cooling', 'compressor'],
  },
  {
    category: 'Air Conditioning Maintenance',
    expectedServiceKeyword: 'ac periodic',
    prohibitedKeywords: [],
  },
];

export async function verifyRemoteCategorySeeding() {
  console.log('=== REMOTE SUPABASE CATEGORY SEEDING VERIFICATION ===');
  console.log(`Connecting to: ${url}`);

  const timestamp = Date.now();
  const testEmail = `test.category.verifier.${timestamp}@renewaldesk.local`;
  const testPassword = `RD-TestPass-${timestamp}!#`;

  console.log(`\n1. Creating authenticated test session: ${testEmail}`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (authErr) {
    throw new Error(`Failed to create test user: ${authErr.message}`);
  }

  const user = authData.user;
  assert(user, 'User must be created');
  console.log(`  ✔ Test user created: ${user.id}`);

  const createdBusinessIds: string[] = [];

  try {
    console.log('\n2. Testing workspace creation and category catalog seeding:');

    for (const testItem of TEST_CATEGORIES) {
      const bizName = `[Test-Verify] ${testItem.category.slice(0, 15)} ${timestamp}`;
      console.log(`\n  Testing: "${testItem.category}"`);

      // Call create_business_and_owner as the authenticated test user
      const { data: bizResult, error: bizErr } = await supabase.rpc('create_business_and_owner', {
        p_name: bizName,
        p_business_type: testItem.category,
        p_phone: '+91 99999 00000',
        p_city: 'Kochi',
        p_timezone: 'Asia/Kolkata',
        p_currency: '₹',
      });

      if (bizErr) {
        throw new Error(`create_business_and_owner failed for ${testItem.category}: ${bizErr.message}`);
      }

      const businessId = bizResult.id;
      createdBusinessIds.push(businessId);
      console.log(`    ✔ Workspace created: ID=${businessId}`);

      // Query seeded service types strictly for this business_id
      const { data: services, error: sErr } = await supabase
        .from('service_types')
        .select('name, interval_value, interval_unit, typical_fee')
        .eq('business_id', businessId);

      if (sErr) {
        throw new Error(`Failed to fetch service types: ${sErr.message}`);
      }

      assert(services && services.length >= 3, `Expected at least 3 services, found ${services?.length}`);
      const serviceNames = services.map((s) => s.name.toLowerCase()).join(' | ');
      console.log(`    ✔ Seeded services (${services.length}): ${services.map((s) => s.name).join(', ')}`);

      // Check expected keyword
      assert(
        serviceNames.includes(testItem.expectedServiceKeyword.toLowerCase()),
        `Service names [${serviceNames}] must contain expected keyword "${testItem.expectedServiceKeyword}"`
      );

      // Check prohibited keywords
      for (const prohibited of testItem.prohibitedKeywords) {
        assert(
          !serviceNames.includes(prohibited),
          `Non-AC business "${testItem.category}" must NOT contain prohibited term "${prohibited}". Found in: ${serviceNames}`
        );
      }
      console.log(`    ✔ AC-isolation verified: 0 prohibited AC terms found in ${testItem.category} services.`);

      // Query seeded message templates strictly for this business_id
      const { data: templates, error: tErr } = await supabase
        .from('message_templates')
        .select('name, template_type, message_body')
        .eq('business_id', businessId);

      if (tErr) {
        throw new Error(`Failed to fetch message templates: ${tErr.message}`);
      }

      assert(templates && templates.length === 5, `Expected 5 lifecycle templates, found ${templates?.length}`);
      const templateBodies = templates.map((t) => t.message_body.toLowerCase()).join(' ');

      for (const prohibited of testItem.prohibitedKeywords) {
        assert(
          !templateBodies.includes(prohibited),
          `Non-AC templates for "${testItem.category}" must NOT contain "${prohibited}".`
        );
      }
      console.log(`    ✔ Templates verified (${templates.length} lifecycle templates, 0 prohibited AC terms).`);
    }

    console.log('\n=== ALL CATEGORY SEEDING LIVE CHECKS PASSED ===');
  } finally {
    // Clean up test businesses
    console.log('\n3. Cleaning up temporary test workspaces:');
    for (const bId of createdBusinessIds) {
      try {
        await supabase.from('businesses').delete().eq('id', bId);
        console.log(`  ✔ Deleted test business: ${bId}`);
      } catch (cleanErr) {
        console.warn(`  Warning: could not delete test business ${bId}:`, cleanErr);
      }
    }

    // Sign out test user
    await supabase.auth.signOut();
    console.log('  ✔ Signed out test session.');
  }
}

// Execute if run directly
if (require.main === module) {
  verifyRemoteCategorySeeding()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ VERIFICATION FAILED:', err.message);
      process.exit(1);
    });
}
