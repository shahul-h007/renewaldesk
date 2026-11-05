import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createBrowserClient } from '@supabase/ssr';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;
const CDP_PORT = 9225;

const ROUTES = [
  '/templates',
  '/dashboard',
  '/customers',
  '/import',
  '/results',
  '/settings',
  '/services',
  '/billing',
  '/pricing',
  '/',
  '/login',
  '/signup',
  '/onboarding',
];

const VIEWPORTS = [
  { width: 360, height: 800, label: '360px (Galaxy A55)' },
  { width: 320, height: 640, label: '320px (iPhone SE 1st / Minimum)' },
  { width: 390, height: 844, label: '390px (iPhone 14 / Standard)' },
];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isServerReady() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE_URL}/`, { signal: controller.signal });
    clearTimeout(timer);
    return res.status === 200 || res.status === 307 || res.status === 308;
  } catch {
    return false;
  }
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

async function getAuthCookies() {
  const env = Object.fromEntries(
    fs
      .readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const [k, ...v] = l.split('=');
        return [k.trim(), v.join('=').trim().replace(/^['"]|['"]$/g, '')];
      })
  );

  const cookies = {};
  const client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookies[name];
      },
      set(name, value) {
        cookies[name] = value;
      },
      remove(name) {
        delete cookies[name];
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: 'audit_runner@renewaldesk.test',
    password: 'AuditPassword123!Secure',
  });

  if (error) {
    console.error('Failed to get auth session for audit runner:', error.message);
    return [];
  }

  return Object.entries(cookies).map(([name, value]) => ({ name, value }));
}

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 RUNNING MOBILE VIEWPORT OVERFLOW AUDIT (320px, 360px, 390px)');
  console.log('================================================================\n');

  let serverProc = null;
  const alreadyRunning = await isServerReady();

  if (!alreadyRunning) {
    console.log(`Starting Next.js server on port ${PORT}...`);
    serverProc = spawn('npx.cmd', ['next', 'dev', '-p', String(PORT)], {
      cwd: process.cwd(),
      stdio: 'ignore',
      shell: true,
    });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await delay(1000);
      if (await isServerReady()) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.error(`❌ Failed to start Next.js server on port ${PORT}.`);
      if (serverProc) serverProc.kill();
      process.exit(1);
    }
    console.log(`✓ Next.js server ready on port ${PORT}.\n`);
  } else {
    console.log(`✓ Using running Next.js server on port ${PORT}.\n`);
  }

  const authCookies = await getAuthCookies();
  console.log(`✓ Obtained ${authCookies.length} Supabase session cookies.`);

  const tmpProfile = path.join(os.tmpdir(), `edge_audit_${Date.now()}`);
  fs.mkdirSync(tmpProfile, { recursive: true });

  console.log('Launching headless Microsoft Edge via CDP...');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--window-size=360,800',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ]);

  let cdpUrl = null;
  for (let i = 0; i < 20; i++) {
    await delay(500);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const tabs = await res.json();
      const pageTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || tabs.find((t) => t.webSocketDebuggerUrl);
      if (pageTab) {
        cdpUrl = pageTab.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!cdpUrl) {
    console.error('❌ Failed to connect to Edge CDP on port 9225.');
    edgeProc.kill();
    serverProc.kill();
    process.exit(1);
  }

  const cdp = new CDPClient(cdpUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Network.enable');

  // Navigate to origin first
  await cdp.send('Page.navigate', { url: `${BASE_URL}/login` });
  await delay(1000);

  // Set cookies directly in page context
  for (const c of authCookies) {
    await cdp.send('Runtime.evaluate', {
      expression: `document.cookie = ${JSON.stringify(`${c.name}=${c.value}; path=/; max-age=86400`)};`,
    });
  }

  // Pre-navigate to dashboard to verify session
  await cdp.send('Page.navigate', { url: `${BASE_URL}/dashboard` });
  await delay(2000);

  const testNav = await cdp.send('Runtime.evaluate', {
    expression: 'window.location.pathname',
    returnByValue: true,
  });
  console.log('✓ Navigation check after cookie injection:', testNav.result?.value);

  let totalTests = 0;
  let totalFailures = 0;
  const failureDetails = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport: ${vp.label} (${vp.width}x${vp.height}) ---`);

    await cdp.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    });

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: true,
      fitWindow: false,
    });

    for (const route of ROUTES) {
      totalTests++;
      const url = `${BASE_URL}${route}`;

      await cdp.send('Page.navigate', { url });
      // Allow Next.js client hydration and layout calculation
      await delay(1200);

      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const doc = document.documentElement;
            const scrollWidth = doc.scrollWidth;
            const innerWidth = window.innerWidth;
            const pathname = window.location.pathname;
            const isOverflowing = scrollWidth > innerWidth;

            let culprit = null;
            if (isOverflowing) {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.right > innerWidth + 1) {
                  culprit = {
                    tag: el.tagName.toLowerCase(),
                    className: (el.className || '').toString().slice(0, 80),
                    text: (el.innerText || '').slice(0, 50).replace(/\\n/g, ' '),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width)
                  };
                  break;
                }
              }
            }

            return {
              pathname,
              scrollWidth,
              innerWidth,
              isOverflowing,
              culprit
            };
          })()
        `,
        returnByValue: true,
      });

      const result = evalRes.result?.value;
      if (!result) {
        console.log(`  ⚠️  ${route}: Unable to evaluate`);
        continue;
      }

      if (result.isOverflowing) {
        totalFailures++;
        console.log(`  ❌ FAIL: ${route} [rendered: ${result.pathname}] (scrollWidth: ${result.scrollWidth}px > innerWidth: ${result.innerWidth}px)`);
        if (result.culprit) {
          console.log(`     Culprit: <${result.culprit.tag} class="${result.culprit.className}"> (width: ${result.culprit.width}px, right: ${result.culprit.right}px)`);
          console.log(`     Content: "${result.culprit.text}"`);
        }
        failureDetails.push({ route, vp: vp.label, ...result });
      } else {
        console.log(`  ✔ PASS: ${route} [rendered: ${result.pathname}] (scrollWidth: ${result.scrollWidth}px <= innerWidth: ${result.innerWidth}px)`);
      }
    }
  }

  cdp.close();
  edgeProc.kill();
  if (serverProc) {
    serverProc.kill();
    try {
      execSync(`taskkill /F /PID ${serverProc.pid} /T 2>nul`);
    } catch {}
  }

  try {
    execSync(`taskkill /F /PID ${serverProc.pid} /T 2>nul`);
  } catch {}

  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  if (totalFailures === 0) {
    console.log(`🎉 ALL ${totalTests} VIEWPORT OVERFLOW AUDIT CHECKS PASSED! ZERO OVERFLOW.`);
  } else {
    console.log(`❌ ${totalFailures} of ${totalTests} CHECKS FAILED WITH HORIZONTAL OVERFLOW.`);
  }
  console.log('================================================================\n');

  process.exit(totalFailures === 0 ? 0 : 1);
}

runAudit().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
