import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const razorpayKeyId = env['RAZORPAY_KEY_ID'] || '';
const razorpayKeySecret = env['RAZORPAY_KEY_SECRET'] || '';

async function runDiagnostic() {
  console.log('====================================================');
  console.log('1. CHECKING SUPABASE BILLING TABLES & RPCS');
  console.log('====================================================');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const billingTables = ['business_subscriptions', 'payment_transactions', 'webhook_events'];
  for (const table of billingTables) {
    const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table public.${table}: MISSING / ERROR -> Code: ${error.code}, Message: ${error.message}`);
    } else {
      console.log(`✔ Table public.${table}: EXISTS (Count: ${count ?? 0})`);
    }
  }

  // Check RPC functions
  const { error: rpcCapErr } = await supabase.rpc('check_customer_capacity', {
    p_business_id: '00000000-0000-0000-0000-000000000000',
    p_incoming_count: 1,
  });
  if (rpcCapErr) {
    console.log(`❌ RPC check_customer_capacity: Code: ${rpcCapErr.code}, Message: ${rpcCapErr.message}`);
  } else {
    console.log(`✔ RPC check_customer_capacity: EXISTS`);
  }

  const { error: rpcSlotErr } = await supabase.rpc('claim_founding_lifetime_slot', {
    p_business_id: '00000000-0000-0000-0000-000000000000',
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_order_id: 'order_test',
    p_payment_id: 'pay_test',
  });
  if (rpcSlotErr) {
    console.log(`❌ RPC claim_founding_lifetime_slot: Code: ${rpcSlotErr.code}, Message: ${rpcSlotErr.message}`);
  } else {
    console.log(`✔ RPC claim_founding_lifetime_slot: EXISTS`);
  }

  console.log('\n====================================================');
  console.log('2. CHECKING RAZORPAY TEST MODE RECENT PAYMENTS & ORDERS');
  console.log('====================================================');
  if (!razorpayKeyId || !razorpayKeySecret) {
    console.log('❌ Razorpay credentials not configured in .env.local');
    return;
  }

  const rzp = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });

  try {
    const payments = await rzp.payments.all({ count: 5 });
    console.log(`Found ${payments.items.length} recent payment(s) in Razorpay Test Mode:`);
    for (const p of payments.items) {
      console.log(`  - Payment ID: ${p.id}`);
      console.log(`    Status:     ${p.status}`); // 'authorized', 'captured', 'failed'
      console.log(`    Amount:     ₹${Number(p.amount) / 100} (${p.currency})`);
      console.log(`    Method:     ${p.method}`);
      console.log(`    Order ID:   ${p.order_id || 'N/A'}`);
      console.log(`    Created At: ${new Date(p.created_at * 1000).toISOString()}`);
      console.log(`    Captured:   ${p.captured}`);
      console.log(`    Error Code: ${p.error_code || 'None'}`);
      console.log(`    Notes:      ${JSON.stringify(p.notes)}`);
      console.log('    ---');
    }

    const orders = await rzp.orders.all({ count: 5 });
    console.log(`\nFound ${orders.items.length} recent order(s) in Razorpay Test Mode:`);
    for (const ord of orders.items) {
      console.log(`  - Order ID:   ${ord.id}`);
      console.log(`    Amount:     ₹${Number(ord.amount) / 100}`);
      console.log(`    Status:     ${ord.status}`);
      console.log(`    Attempts:   ${ord.attempts}`);
      console.log(`    Created At: ${new Date(ord.created_at * 1000).toISOString()}`);
      console.log(`    Notes:      ${JSON.stringify(ord.notes)}`);
      console.log('    ---');
    }
  } catch (err: any) {
    console.error('Error fetching Razorpay data:', err.message);
  }
}

runDiagnostic().catch(console.error);
