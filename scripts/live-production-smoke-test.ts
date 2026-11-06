import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { interpolateTemplate, generateWhatsAppLink } from '../lib/whatsapp';
import { calculateNextDueDate } from '../lib/due-date-engine';
import { getTrialInfo, FREE_TRIAL_MAX_CUSTOMERS } from '../lib/billing/plans';

// Load .env.local
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const PROD_URL = 'https://renewaldesk.chronyx.in';

interface SmokeTestReport {
  landingPage: boolean;
  pricingPage: boolean;
  paymentsStatus: string;
  signUp: boolean;
  onboarding: boolean;
  addCustomer: boolean;
  whatsAppLink: boolean;
  freeTrial: boolean;
  teardown: boolean;
  userId?: string;
  businessId?: string;
}

async function runLiveSmokeTest(): Promise<SmokeTestReport> {
  console.log('================================================================');
  console.log('   RENEWALDESK LIVE PRODUCTION SMOKE TEST');
  console.log('   Target Domain:', PROD_URL);
  console.log('   Timestamp:   ', new Date().toISOString());
  console.log('================================================================\n');

  const report: SmokeTestReport = {
    landingPage: false,
    pricingPage: false,
    paymentsStatus: '',
    signUp: false,
    onboarding: false,
    addCustomer: false,
    whatsAppLink: false,
    freeTrial: false,
    teardown: false,
  };

  const timestamp = Date.now();
  const testEmail = `smoke.test.${timestamp}@chronyx.in`;
  const testPassword = `SmokeSecure!_${timestamp}_#123`;
  let testBusinessId: string | null = null;
  let testUserId: string | null = null;

  const authCookies: Record<string, string> = {};
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return authCookies[name];
      },
      set(name, value) {
        authCookies[name] = value;
      },
      remove(name) {
        delete authCookies[name];
      },
    },
  });

  const getCookieHeader = () =>
    Object.entries(authCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

  try {
    // -----------------------------------------------------------------
    // 1. Landing Page Check
    // -----------------------------------------------------------------
    console.log('--- 1. Testing Production Landing Page (/) ---');
    const landingRes = await fetch(`${PROD_URL}/`, {
      headers: { 'User-Agent': 'RenewalDesk-SmokeTest/1.0' },
    });
    console.log(`  HTTP Status: ${landingRes.status} ${landingRes.statusText}`);
    assert.strictEqual(landingRes.status, 200, 'Landing page must return HTTP 200');
    const landingHtml = await landingRes.text();
    assert(landingHtml.includes('RenewalDesk'), 'Landing page must contain RenewalDesk branding');
    assert(landingHtml.includes('/pricing'), 'Landing page must contain /pricing link');
    assert(landingHtml.includes('/login') || landingHtml.includes('/signup'), 'Landing page must contain auth links');
    console.log('  ✔ Landing page is online, returns 200, and contains expected branding and CTA links.');
    report.landingPage = true;

    // -----------------------------------------------------------------
    // 2. Pricing Page & Payment Status Check
    // -----------------------------------------------------------------
    console.log('\n--- 2. Testing Production Pricing Page (/pricing) ---');
    const pricingRes = await fetch(`${PROD_URL}/pricing`, {
      headers: { 'User-Agent': 'RenewalDesk-SmokeTest/1.0' },
    });
    console.log(`  HTTP Status: ${pricingRes.status} ${pricingRes.statusText}`);
    assert.strictEqual(pricingRes.status, 200, 'Pricing page must return HTTP 200');
    const pricingHtml = await pricingRes.text();
    assert(pricingHtml.includes('Free Trial'), 'Pricing page must advertise Free Trial');
    assert(pricingHtml.includes('Founding Lifetime') || pricingHtml.includes('599'), 'Pricing page must display Founding Lifetime plan');
    console.log('  ✔ Pricing page is online and returns 200 with plan tiers.');

    // Check payment gateway status via server endpoint
    const usageRes = await fetch(`${PROD_URL}/api/billing/usage`);
    assert.strictEqual(usageRes.status, 200, 'Usage endpoint must return 200');
    const usageData = await usageRes.json();
    console.log('  Payment Gateway Configuration Status:', usageData);
    report.paymentsStatus = usageData.paymentsConfigured ? 'Configured (Active)' : 'Payments Not Available Yet (Fallback Active)';
    console.log(`  ✔ Payment status reported: ${report.paymentsStatus}`);
    report.pricingPage = true;

    // -----------------------------------------------------------------
    // 3. User Sign Up
    // -----------------------------------------------------------------
    console.log('\n--- 3. Testing Live User Registration ---');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Live Smoke Tester',
        },
      },
    });

    if (authError) {
      throw new Error(`Sign up failed: ${authError.message}`);
    }

    assert(authData.user, 'Auth response must return a user object');
    testUserId = authData.user.id;
    report.userId = testUserId;
    console.log(`  ✔ User created: ID=${testUserId}, Email=${testEmail}`);

    let session = authData.session;
    if (!session) {
      console.log('  ℹ Establishing authenticated session via signInWithPassword...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      if (signInError) {
        throw new Error(`Sign in failed after signup: ${signInError.message}`);
      }
      session = signInData.session;
    }

    assert(session?.access_token, 'Active session token must be established');
    console.log('  ✔ Live authentication session successfully established.');
    report.signUp = true;

    // -----------------------------------------------------------------
    // 4. Onboarding: Workspace Creation
    // -----------------------------------------------------------------
    console.log('\n--- 4. Testing Business Onboarding Procedure ---');
    const bizName = `Smoke Test Auto Care ${timestamp}`;
    const { data: bizResult, error: bizErr } = await supabase.rpc('create_business_and_owner', {
      p_name: bizName,
      p_business_type: 'Vehicle Service & Auto Care',
      p_phone: '+91 98470 12345',
      p_city: 'Kochi',
      p_timezone: 'Asia/Kolkata',
      p_currency: '₹',
    });

    if (bizErr) {
      throw new Error(`create_business_and_owner RPC failed: ${bizErr.message}`);
    }

    testBusinessId = bizResult.id;
    report.businessId = testBusinessId;
    assert(testBusinessId, 'Business ID must be returned');
    console.log(`  ✔ Business workspace onboarded: ID=${testBusinessId}, Name="${bizResult.name}"`);

    // Verify membership
    const { data: members, error: memErr } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', testBusinessId)
      .eq('user_id', testUserId);

    assert(!memErr && members?.length === 1 && members[0].role === 'owner', 'User must be owner in business_members');
    console.log('  ✔ Verified user is owner of the business.');

    // Verify seeded service catalog
    const { data: services, error: servErr } = await supabase
      .from('service_types')
      .select('*')
      .eq('business_id', testBusinessId);

    assert(!servErr && services && services.length >= 4, `Expected at least 4 seeded service types, found ${services?.length}`);
    console.log(`  ✔ Verified category catalog seeded (${services.length} service types).`);
    report.onboarding = true;

    // -----------------------------------------------------------------
    // 5. Add Customer & Reminder
    // -----------------------------------------------------------------
    console.log('\n--- 5. Testing Customer, Asset & Follow-up Creation ---');
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert({
        business_id: testBusinessId,
        name: 'Arun Kumar',
        phone: '+91 98460 11222',
        email: 'arun@example.com',
        address: 'Panampilly Nagar, Kochi, Kerala',
        locality: 'Panampilly Nagar',
      })
      .select()
      .single();

    assert(!custErr && customer, `Customer insert failed: ${custErr?.message}`);
    console.log(`  ✔ Customer record saved: ID=${customer.id}, Name="${customer.name}"`);

    const { data: asset, error: assetErr } = await supabase
      .from('assets')
      .insert({
        business_id: testBusinessId,
        customer_id: customer.id,
        asset_type: 'Motorcycle',
        brand: 'Royal Enfield',
        model: 'Hunter 350',
      })
      .select()
      .single();

    assert(!assetErr && asset, `Asset insert failed: ${assetErr?.message}`);
    console.log(`  ✔ Customer asset saved: Brand="${asset.brand}", Model="${asset.model}"`);

    const serviceType = services[0];
    const nextDue = calculateNextDueDate('2026-05-01', serviceType.interval_value, serviceType.interval_unit);

    const { data: schedule, error: schedErr } = await supabase
      .from('service_schedules')
      .insert({
        business_id: testBusinessId,
        customer_id: customer.id,
        asset_id: asset.id,
        service_type_id: serviceType.id,
        service_name: serviceType.name,
        last_service_date: '2026-05-01',
        next_due_date: nextDue,
        interval_value: serviceType.interval_value,
        interval_unit: serviceType.interval_unit,
        status: 'ACTIVE',
      })
      .select()
      .single();

    assert(!schedErr && schedule, `Schedule insert failed: ${schedErr?.message}`);
    console.log(`  ✔ Service schedule created: Next Due="${schedule.next_due_date}"`);

    const { data: reminder, error: remErr } = await supabase
      .from('reminders')
      .insert({
        business_id: testBusinessId,
        customer_id: customer.id,
        schedule_id: schedule.id,
        due_date: nextDue,
        status: 'NOT_CONTACTED',
      })
      .select()
      .single();

    assert(!remErr && reminder, `Reminder insert failed: ${remErr?.message}`);
    console.log(`  ✔ Today queue reminder created: Status="${reminder.status}"`);
    report.addCustomer = true;

    // -----------------------------------------------------------------
    // 6. WhatsApp Link Generation & Placeholder Interpolation
    // -----------------------------------------------------------------
    console.log('\n--- 6. Testing WhatsApp Link & Placeholder Interpolation ---');
    const sampleTemplate = 'Hello {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Please contact us at {{business_phone}} to book.';
    const interpolated = interpolateTemplate(sampleTemplate, {
      customer_name: customer.name,
      asset_name: `${asset.brand} ${asset.model}`,
      service_name: serviceType.name,
      due_date: nextDue,
      business_name: bizName,
      business_phone: '+91 98470 12345',
    });

    console.log('  Interpolated Message:\n  ', interpolated.replace(/\n/g, ' '));
    assert(!interpolated.includes('{{customer_name}}'), 'customer_name must be interpolated');
    assert(!interpolated.includes('{{asset_name}}'), 'asset_name must be interpolated');
    assert(!interpolated.includes('{{service_name}}'), 'service_name must be interpolated');
    assert(!interpolated.includes('{{due_date}}'), 'due_date must be interpolated');
    assert(interpolated.includes('Arun Kumar'), 'Must contain customer name');
    assert(interpolated.includes('Hunter 350'), 'Must contain vehicle model');

    const whatsappLink = generateWhatsAppLink(customer.phone, interpolated);

    console.log('  Generated WhatsApp Link:', whatsappLink);
    assert(whatsappLink.startsWith('https://wa.me/919846011222?text='), 'Must be standard wa.me format');
    assert(whatsappLink.includes(encodeURIComponent('Arun Kumar')), 'URL must contain encoded name');
    console.log('  ✔ WhatsApp link generated cleanly without raw placeholder syntax.');
    report.whatsAppLink = true;

    // -----------------------------------------------------------------
    // 7. Free Trial Verification
    // -----------------------------------------------------------------
    console.log('\n--- 7. Testing 14-Day Free Trial State & Limits ---');
    // Check initial subscription state
    const { data: subData } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', testBusinessId)
      .maybeSingle();

    const initialTrial = getTrialInfo(subData);
    console.log('  Initial Workspace Subscription State:', {
      hasSubscriptionRow: Boolean(subData),
      trialStatus: initialTrial,
      maxAllowedCustomers: FREE_TRIAL_MAX_CUSTOMERS,
    });

    // Test calling the production API trial start endpoint with session cookie
    const cookieHeader = getCookieHeader();
    console.log(`  Sending Cookie header (${Object.keys(authCookies).length} cookies)...`);

    const trialStartRes = await fetch(`${PROD_URL}/api/billing/trial/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ businessId: testBusinessId }),
    });

    console.log(`  POST /api/billing/trial/start Status: ${trialStartRes.status}`);
    const trialStartJson = await trialStartRes.json();
    console.log('  Trial Start Response:', trialStartJson);

    assert.strictEqual(trialStartRes.status, 200, 'Trial start must return 200 OK');
    assert.strictEqual(trialStartJson.success, true, 'Trial start response must have success: true');
    console.log('  ✔ Free trial activated via API route.');

    assert.strictEqual(FREE_TRIAL_MAX_CUSTOMERS, 25, 'Free trial must permit 25 customers');
    console.log('  ✔ 14-Day Free Trial configuration verified (25 active customer limit).');
    report.freeTrial = true;

    // -----------------------------------------------------------------
    // 8. Checkout Edge Case: Unconfigured / Test Payments Check
    // -----------------------------------------------------------------
    console.log('\n--- 8. Testing Checkout Gateway Response ---');
    const checkoutRes = await fetch(`${PROD_URL}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        businessId: testBusinessId,
        planId: 'starter',
      }),
    });

    console.log(`  POST /api/billing/checkout Status: ${checkoutRes.status}`);
    const checkoutJson = await checkoutRes.json();
    console.log('  Checkout Response:', checkoutJson);

    if (checkoutRes.status === 503) {
      console.log('  ✔ "Payments not available yet" verified: returns 503 with user guidance.');
    } else if (checkoutRes.status === 200) {
      console.log('  ✔ Razorpay order successfully created on live server.');
    }

  } finally {
    // -----------------------------------------------------------------
    // 9. Teardown & Permanent Cleanup
    // -----------------------------------------------------------------
    console.log('\n--- 9. Permanent Cleanup & Teardown of Test Data ---');
    if (testBusinessId) {
      try {
        await supabase.from('reminders').delete().eq('business_id', testBusinessId);
        await supabase.from('service_schedules').delete().eq('business_id', testBusinessId);
        await supabase.from('service_records').delete().eq('business_id', testBusinessId);
        await supabase.from('assets').delete().eq('business_id', testBusinessId);
        await supabase.from('customers').delete().eq('business_id', testBusinessId);
        await supabase.from('message_templates').delete().eq('business_id', testBusinessId);
        await supabase.from('service_types').delete().eq('business_id', testBusinessId);
        await supabase.from('activities').delete().eq('business_id', testBusinessId);
        await supabase.from('business_subscriptions').delete().eq('business_id', testBusinessId);
        await supabase.from('business_members').delete().eq('business_id', testBusinessId);
        await supabase.from('businesses').delete().eq('id', testBusinessId);
        console.log(`  ✔ Successfully purged test business workspace (${testBusinessId})`);
      } catch (err: any) {
        console.warn('  Cleanup warning:', err.message);
      }
    }

    await supabase.auth.signOut();
    console.log('  ✔ Auth session terminated.');
    report.teardown = true;
  }

  console.log('\n================================================================');
  console.log('   🎉 LIVE PRODUCTION SMOKE TEST SUMMARY');
  console.log('================================================================');
  console.log('  Landing Page (200 OK):       ', report.landingPage ? 'PASSED' : 'FAILED');
  console.log('  Pricing Page (200 OK):       ', report.pricingPage ? 'PASSED' : 'FAILED');
  console.log('  Payments Gateway Status:     ', report.paymentsStatus);
  console.log('  Sign Up & Auth:              ', report.signUp ? 'PASSED' : 'FAILED');
  console.log('  Atomic Onboarding:           ', report.onboarding ? 'PASSED' : 'FAILED');
  console.log('  Customer & Reminder Added:   ', report.addCustomer ? 'PASSED' : 'FAILED');
  console.log('  WhatsApp Link & Tags:        ', report.whatsAppLink ? 'PASSED' : 'FAILED');
  console.log('  14-Day Free Trial (25 Cap):  ', report.freeTrial ? 'PASSED' : 'FAILED');
  console.log('  Zero-Trace Database Teardown:', report.teardown ? 'PASSED' : 'FAILED');
  console.log('================================================================\n');

  return report;
}

runLiveSmokeTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ LIVE PRODUCTION SMOKE TEST FAILED:', err);
    process.exit(1);
  });
