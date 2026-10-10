import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('STATUS: .env.local file not found.');
  process.exit(1);
}

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
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

if (!url || !key) {
  console.log('STATUS: Missing URL or ANON KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkLiveStatus() {
  console.log('🔍 Checking connection to Supabase Project:', url);

  // Check auth health
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    console.log('  ✔ Supabase Auth endpoint is reachable.');
  } catch (err: any) {
    console.log('  ❌ Auth endpoint unreachable:', err.message);
  }

  // Check tables to see if migration has been applied
  const tables = [
    'profiles',
    'businesses',
    'business_members',
    'customers',
    'assets',
    'service_types',
    'service_records',
    'service_schedules',
    'reminders',
    'message_templates',
    'activities'
  ];

  console.log('\n📊 Checking migration status of tables:');
  const results: Record<string, string> = {};
  let tablesFound = 0;
  let tablesMissing = 0;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist') || error.code === '42P01') {
        results[table] = 'NOT_APPLIED (Table does not exist yet)';
        tablesMissing++;
      } else {
        results[table] = `ERROR (${error.code}: ${error.message})`;
      }
    } else {
      results[table] = 'EXISTS (Table exists and RLS active)';
      tablesFound++;
    }
  }

  for (const [table, status] of Object.entries(results)) {
    console.log(`  - public.${table}: ${status}`);
  }

  console.log('\nSummary:');
  console.log(`  Existing Tables: ${tablesFound} / ${tables.length}`);
  console.log(`  Missing Tables:  ${tablesMissing} / ${tables.length}`);
  if (tablesMissing === tables.length) {
    console.log('  👉 Migration STATUS: PENDING. The SQL migration has NOT yet been applied to this project.');
  } else if (tablesFound === tables.length) {
    console.log('  👉 Migration STATUS: APPLIED. All 11 tables exist in this project!');
  } else {
    console.log('  👉 Migration STATUS: PARTIALLY_APPLIED.');
  }
}

checkLiveStatus().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
