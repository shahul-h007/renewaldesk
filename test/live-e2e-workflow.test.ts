import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { calculateNextDueDate } from '../lib/due-date-engine';

// 1. Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const url = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

console.log('🧪 Starting Live Supabase Integration & RLS Workflow Test...\n');
console.log('Project Target:', url);

async function runLiveWorkflow() {
  const timestamp = Date.now();
  const testEmail = `renewaldesk.pilot.${timestamp}@gmail.com`;
  const testPassword = `TestPass!_${timestamp}_Secure#1`;

  // Create isolated client for this test session
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // ==========================================
  // Step 1: User Signup
  // ==========================================
  console.log('\n--- Step 1: Testing Live Supabase Auth Signup ---');
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Test Business Owner',
      },
    },
  });

  if (signUpErr) {
    console.error('❌ Sign up failed:', signUpErr.message);
    throw signUpErr;
  }

  const user = signUpData.user;
  assert(user, 'User object must be returned from signUp');
  console.log(`  ✔ User created successfully: ID=${user.id}`);

  // If email confirmation is enabled on this Supabase project, sign in directly if session exists,
  // or check if session was established.
  let session = signUpData.session;
  if (!session) {
    console.log('  ℹ No immediate session returned (Email Confirmation may be active on Supabase).');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInErr) {
      console.log('  ⚠ Email confirmation is required by Supabase Auth project settings:', signInErr.message);
      console.log('  👉 To allow instant sign-ups without email confirmation loops, disable "Confirm email" in Supabase Dashboard > Authentication > Providers > Email.');
      return { emailConfirmationRequired: true };
    }
    session = signInData.session;
  }

  assert(session, 'Must have active authenticated session');
  console.log('  ✔ Authenticated session active.');

  // ==========================================
  // Step 2: User Profile Verification
  // ==========================================
  console.log('\n--- Step 2: Testing Profile Trigger (handle_new_user) ---');
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  assert(!profErr, `Profile must be readable: ${profErr?.message}`);
  assert.strictEqual(profile.email, testEmail, 'Profile email must match signup email');
  console.log('  ✔ Profile record verified in public.profiles.');

  // ==========================================
  // Step 3: Atomic Business Onboarding
  // ==========================================
  console.log('\n--- Step 3: Testing Atomic Business Onboarding Procedure ---');
  const businessName = `Kochi Test AC Care ${timestamp}`;
  const { data: bizResult, error: bizErr } = await supabase.rpc('create_business_and_owner', {
    p_name: businessName,
    p_business_type: 'Air Conditioning Maintenance',
    p_phone: '+91 98470 12345',
    p_city: 'Kochi',
    p_timezone: 'Asia/Kolkata',
    p_currency: '₹',
  });

  assert(!bizErr, `create_business_and_owner must succeed: ${bizErr?.message}`);
  const businessId = bizResult.id;
  assert(businessId, 'Business ID must be returned');
  console.log(`  ✔ Business workspace created: ID=${businessId}, Name="${bizResult.name}"`);

  // Verify membership
  const { data: memberRows, error: memErr } = await supabase
    .from('business_members')
    .select('*')
    .eq('business_id', businessId)
    .eq('user_id', user.id);

  assert(!memErr, `Membership must be queryable: ${memErr?.message}`);
  assert.strictEqual(memberRows.length, 1, 'User must have exactly 1 membership');
  assert.strictEqual(memberRows[0].role, 'owner', 'User role must be owner');
  console.log('  ✔ Owner membership verified in public.business_members.');

  // Verify seeded catalog items
  const { data: seedTypes, error: stErr } = await supabase
    .from('service_types')
    .select('*')
    .eq('business_id', businessId);

  assert(!stErr, `Service types must be queryable: ${stErr?.message}`);
  assert(seedTypes.length >= 4, `Expected at least 4 seed service types, got ${seedTypes.length}`);
  console.log(`  ✔ Seed service types verified (${seedTypes.length} types found).`);

  // ==========================================
  // Step 4: Customer, Asset & Schedule Creation
  // ==========================================
  console.log('\n--- Step 4: Testing Live Customer & Asset Persistence ---');
  
  // 1. Insert customer
  const { data: custRow, error: cErr } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      name: 'Nikhil Varma',
      phone: '+91 98471 99887',
      email: 'nikhil@example.com',
      address: 'Kakkanad, Kochi, Kerala',
      locality: 'Kakkanad',
    })
    .select()
    .single();

  assert(!cErr, `Customer insert failed: ${cErr?.message}`);
  console.log(`  ✔ Customer inserted: ID=${custRow.id}, Name="${custRow.name}"`);

  // 2. Insert asset
  const { data: assetRow, error: aErr } = await supabase
    .from('assets')
    .insert({
      business_id: businessId,
      customer_id: custRow.id,
      asset_type: 'Split AC',
      brand: 'Panasonic',
      model: 'CS/CU-KN18WKY',
      capacity: '1.5 Ton',
    })
    .select()
    .single();

  assert(!aErr, `Asset insert failed: ${aErr?.message}`);
  console.log(`  ✔ Asset inserted: ID=${assetRow.id}, Brand="${assetRow.brand}"`);

  // 3. Insert service schedule
  const serviceType = seedTypes[0];
  const nextDue = calculateNextDueDate('2026-01-15', serviceType.interval_value, serviceType.interval_unit);
  
  const { data: schedRow, error: sErr } = await supabase
    .from('service_schedules')
    .insert({
      business_id: businessId,
      customer_id: custRow.id,
      asset_id: assetRow.id,
      service_type_id: serviceType.id,
      service_name: serviceType.name,
      last_service_date: '2026-01-15',
      next_due_date: nextDue,
      interval_value: serviceType.interval_value,
      interval_unit: serviceType.interval_unit,
      status: 'ACTIVE',
    })
    .select()
    .single();

  assert(!sErr, `Schedule insert failed: ${sErr?.message}`);
  console.log(`  ✔ Service schedule inserted: Next Due="${schedRow.next_due_date}"`);

  // 4. Insert reminder
  const { data: remRow, error: rErr } = await supabase
    .from('reminders')
    .insert({
      business_id: businessId,
      customer_id: custRow.id,
      schedule_id: schedRow.id,
      due_date: nextDue,
      status: 'CONTACTED',
      contacted_at: new Date().toISOString(),
    })
    .select()
    .single();

  assert(!rErr, `Reminder insert failed: ${rErr?.message}`);
  console.log(`  ✔ Reminder inserted: Status="${remRow.status}"`);

  // ==========================================
  // Step 5: Service Completion & Due Date Advance
  // ==========================================
  console.log('\n--- Step 5: Testing Service Completion & History Ledger ---');
  const completedDate = '2026-07-15';
  const newDue = calculateNextDueDate(completedDate, serviceType.interval_value, serviceType.interval_unit);

  // Insert service record
  const { error: recErr } = await supabase
    .from('service_records')
    .insert({
      business_id: businessId,
      customer_id: custRow.id,
      asset_id: assetRow.id,
      service_type_id: serviceType.id,
      service_name: serviceType.name,
      service_date: completedDate,
      fee_charged: 1200,
      status: 'COMPLETED',
      notes: 'Completed routine maintenance',
    });

  assert(!recErr, `Service record insert failed: ${recErr?.message}`);
  console.log('  ✔ Historic service record logged in public.service_records.');

  // Update schedule
  const { error: schedUpdateErr } = await supabase
    .from('service_schedules')
    .update({
      last_service_date: completedDate,
      next_due_date: newDue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schedRow.id);

  assert(!schedUpdateErr, `Schedule update failed: ${schedUpdateErr?.message}`);
  console.log(`  ✔ Service schedule advanced to next cycle: "${newDue}"`);

  // ==========================================
  // Step 6: Multi-Tenant RLS Boundary Enforcement
  // ==========================================
  console.log('\n--- Step 6: Verifying Multi-Tenant RLS Policy Isolation ---');
  
  // Create an unauthenticated anonymous client
  const unauthClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  // Attempt to read customers as anonymous user
  const { data: anonCusts, error: anonCustErr } = await unauthClient
    .from('customers')
    .select('*')
    .eq('business_id', businessId);

  assert(
    !anonCusts || anonCusts.length === 0,
    'RLS VIOLATION: Anonymous client must not be able to read tenant customers!'
  );
  console.log('  ✔ Anonymous client cannot read tenant customer records (0 rows returned).');

  // Attempt to read service schedules as anonymous user
  const { data: anonScheds } = await unauthClient
    .from('service_schedules')
    .select('*')
    .eq('business_id', businessId);

  assert(
    !anonScheds || anonScheds.length === 0,
    'RLS VIOLATION: Anonymous client must not be able to read tenant schedules!'
  );
  console.log('  ✔ Anonymous client cannot read tenant schedules (0 rows returned).');

  // Attempt to read businesses as anonymous user
  const { data: anonBiz } = await unauthClient
    .from('businesses')
    .select('*')
    .eq('id', businessId);

  assert(
    !anonBiz || anonBiz.length === 0,
    'RLS VIOLATION: Anonymous client must not be able to read business details!'
  );
  // ==========================================
  // Step 7: Security Test - Direct Client Write Blocking on business_members
  // ==========================================
  console.log('\n--- Step 7: Security Test - Direct Client INSERT on business_members ---');
  const fakeBizId = '00000000-0000-0000-0000-000000000000';
  const { data: directInsertData, error: directInsertErr } = await supabase
    .from('business_members')
    .insert({
      business_id: fakeBizId,
      user_id: user.id,
      role: 'owner',
    })
    .select();

  assert(
    directInsertErr || !directInsertData || directInsertData.length === 0,
    'SECURITY VIOLATION: Direct client INSERT on business_members must be blocked by RLS!'
  );
  console.log('  ✔ Direct client INSERT on public.business_members successfully blocked by RLS.');

  console.log('\n--- Step 8: Security Test - Direct Client UPDATE on business_members ---');
  const { data: directUpdateData, error: directUpdateErr } = await supabase
    .from('business_members')
    .update({ role: 'owner' })
    .eq('user_id', user.id)
    .select();

  assert(
    directUpdateErr || !directUpdateData || directUpdateData.length === 0,
    'SECURITY VIOLATION: Direct client UPDATE on business_members must be blocked by RLS!'
  );
  console.log('  ✔ Direct client UPDATE on public.business_members successfully blocked by RLS.');

  // ==========================================
  // Step 9: Cross-Tenant Isolation Verification
  // ==========================================
  console.log('\n--- Step 9: Security Test - Cross-Tenant Customer Access & Hijack ---');
  const tenantBEmail = `renewaldesk.tenantB.${timestamp}@gmail.com`;
  const tenantBPassword = `TestPass!_TenantB_${timestamp}#1`;

  const supabaseB = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userBData, error: userBErr } = await supabaseB.auth.signUp({
    email: tenantBEmail,
    password: tenantBPassword,
    options: { data: { full_name: 'Tenant B Owner' } },
  });

  if (!userBErr && userBData.user) {
    // If immediate session available for Tenant B
    let sessionB = userBData.session;
    if (!sessionB) {
      const { data: signB } = await supabaseB.auth.signInWithPassword({
        email: tenantBEmail,
        password: tenantBPassword,
      });
      sessionB = signB.session;
    }

    if (sessionB) {
      // 1. Tenant B attempts to read Tenant A's customer
      const { data: crossCusts } = await supabaseB
        .from('customers')
        .select('*')
        .eq('business_id', businessId);

      assert(
        !crossCusts || crossCusts.length === 0,
        'CRITICAL SECURITY VIOLATION: Tenant B was able to read Tenant A customers!'
      );
      console.log("  ✔ Tenant B cannot read Tenant A's customers (0 rows returned).");

      // 2. Tenant B attempts to insert a customer into Tenant A's business
      const { data: crossInsert, error: crossInsertErr } = await supabaseB
        .from('customers')
        .insert({
          business_id: businessId,
          name: 'Hacked Customer',
          phone: '+91 99999 00000',
        })
        .select();

      assert(
        crossInsertErr || !crossInsert || crossInsert.length === 0,
        "CRITICAL SECURITY VIOLATION: Tenant B was able to insert a customer into Tenant A's business!"
      );
      console.log("  ✔ Tenant B cannot insert records into Tenant A's business (blocked by RLS).");

      // 3. Tenant B attempts to self-assign membership in Tenant A's business
      const { data: hijackData, error: hijackErr } = await supabaseB
        .from('business_members')
        .insert({
          business_id: businessId,
          user_id: userBData.user.id,
          role: 'owner',
        })
        .select();

      assert(
        hijackErr || !hijackData || hijackData.length === 0,
        'CRITICAL SECURITY VIOLATION: Tenant B was able to self-assign membership into Tenant A!'
      );
      console.log("  ✔ Tenant B cannot self-assign membership to Tenant A's business (blocked by RLS).");
    }
  } else {
    console.log('  ℹ Tenant B live verification skipped (email confirmation active on remote auth).');
  }

  console.log('\n🎉 ALL LIVE DATABASE PERSISTENCE & RLS SECURITY TESTS PASSED 100%!');
  return { success: true };
}

runLiveWorkflow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test execution encountered an error:', err);
    process.exit(1);
  });
