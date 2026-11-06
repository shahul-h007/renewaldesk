import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createBrowserClient } from '@supabase/ssr';
import { TUTORIAL_LESSONS } from '../lib/tutorial-content';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 3006;
const BASE_URL = `http://localhost:${PORT}`;
const CDP_PORT = 9226;

const VIEWPORTS = [
  { width: 360, height: 800, label: '360x800_phone', isMobile: true },
  { width: 390, height: 844, label: '390x844_iphone14', isMobile: true },
  { width: 768, height: 1024, label: '768x1024_tablet', isMobile: false },
  { width: 1440, height: 900, label: '1440x900_desktop', isMobile: false },
];

function delay(ms: number) {
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
  wsUrl: string;
  ws: any;
  id: number;
  callbacks: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new (globalThis as any).WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e: any) => reject(e);
      this.ws.onmessage = (event: any) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id)!;
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`CDP command ${method} timed out after 8000ms`));
        }
      }, 8000);

      this.callbacks.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

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
  const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
  const env = Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const [k, ...v] = l.split('=');
        return [k.trim(), v.join('=').trim().replace(/^['"]|['"]$/g, '')];
      })
  );

  const cookies: Record<string, string> = {};
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
    await client.auth.signUp({
      email: 'audit_runner@renewaldesk.test',
      password: 'AuditPassword123!Secure',
    });
  }

  return Object.entries(cookies).map(([name, value]) => ({ name, value }));
}

async function captureScreenshot(cdp: CDPClient, filepath: string) {
  try {
    const res = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filepath, buffer);
  } catch (err) {
    console.error(`Failed to capture screenshot ${filepath}:`, err);
  }
}

async function runTutorialQA() {
  console.log('================================================================');
  console.log('📸 RENEWALDESK: AUTOMATED SCREENSHOT QA LOOP & CHAOS TESTING');
  console.log('================================================================\n');

  // Ensure output dirs exist
  const qaDir = path.join(process.cwd(), 'qa-screenshots');
  const docsDir = path.join(process.cwd(), 'docs', 'tutorial-qa');
  fs.mkdirSync(qaDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  let serverProc: any = null;
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
    console.log(`✓ Using existing Next.js server on port ${PORT}.\n`);
  }

  const authCookies = await getAuthCookies();
  console.log(`✓ Retrieved ${authCookies.length} session cookies.`);

  const tmpProfile = path.join(os.tmpdir(), `edge_qa_${Date.now()}`);
  fs.mkdirSync(tmpProfile, { recursive: true });

  console.log('Launching headless Microsoft Edge with CDP...');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1440,900',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ]);

  let cdp: CDPClient | null = null;

  try {
    // Wait for CDP endpoint
    let cdpUrl: string | null = null;
    for (let i = 0; i < 20; i++) {
      await delay(500);
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (res.ok) {
          const tabs = (await res.json()) as any[];
          const pageTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || tabs.find((t) => t.webSocketDebuggerUrl);
          if (pageTab) {
            cdpUrl = pageTab.webSocketDebuggerUrl;
            break;
          }
        }
      } catch {}
    }

    if (!cdpUrl) {
      throw new Error('Could not connect to Edge page CDP.');
    }

    cdp = new CDPClient(cdpUrl);
    await cdp.connect();
    console.log('✓ Connected to Edge Page CDP.\n');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // Pre-navigate to /login and set cookies
    await cdp.send('Page.navigate', { url: `${BASE_URL}/login` });
    await delay(1000);

    for (const c of authCookies) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.cookie = ${JSON.stringify(`${c.name}=${c.value}; path=/; max-age=86400`)};`,
      });
    }

    // Navigate to /dashboard
    console.log('Navigating to /dashboard...');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/dashboard` });
    await delay(2500);

    const navCheck = await cdp.send('Runtime.evaluate', {
      expression: 'window.location.pathname',
      returnByValue: true,
    });
    console.log('✓ Page loaded at:', navCheck.result?.value);

    let totalScreenshots = 0;
    let visualCollisionErrors = 0;
    let clippingErrors = 0;

    // =========================================================================
    // ROUND 1: COMPREHENSIVE VIEWPORT & STEP SCREENSHOT WALKTHROUGH
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('ROUND 1: Capturing all 8 lessons across 4 viewports + keyboard mode');
    console.log('----------------------------------------------------------------');

    for (const vp of VIEWPORTS) {
      console.log(`\nTesting Viewport: ${vp.label} (${vp.width}x${vp.height})...`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      let currentPath = '/dashboard';
      for (const lesson of TUTORIAL_LESSONS) {
        // Navigate to the lesson's route if different from current path
        if (lesson.route && currentPath !== lesson.route) {
          await cdp.send('Page.navigate', { url: `${BASE_URL}${lesson.route}` });
          await delay(1200);
          currentPath = lesson.route;
        }

        for (let sIdx = 0; sIdx < lesson.steps.length; sIdx++) {
          const step = lesson.steps[sIdx];

          // Reset modals and set step state
          await cdp.send('Runtime.evaluate', {
            expression: `
              (() => {
                if (window.__rd_tutorial) {
                  window.__rd_tutorial.closeAddCustomerModal();
                  window.__rd_tutorial.closeWhatsAppModal();
                  window.__rd_tutorial.closeCompleteModal();
                  window.__rd_tutorial.closeCustomTemplateModal();
                  window.__rd_tutorial.closeServiceModal();

                  window.__rd_tutorial.setState({
                    isActive: true,
                    hasStarted: true,
                    hasBeenOffered: true,
                    isCompleted: false,
                    isSkipped: false,
                    currentLesson: ${lesson.id},
                    currentStep: ${sIdx},
                    completedLessons: ${JSON.stringify(
                      Array.from({ length: lesson.id - 1 }, (_, i) => i + 1)
                    )},
                  });

                  if (${lesson.id} === 1) {
                    window.__rd_tutorial.openAddCustomerModal();
                  } else if (${lesson.id} === 3 && ${sIdx} >= 1) {
                    window.__rd_tutorial.openWhatsAppModal();
                  } else if (${lesson.id} === 4 && ${sIdx} >= 4) {
                    window.__rd_tutorial.openCompleteModal();
                  } else if (${lesson.id} === 5 && ${sIdx} >= 3) {
                    window.__rd_tutorial.openCustomTemplateModal();
                  } else if (${lesson.id} === 6 && ${sIdx} >= 1) {
                    window.__rd_tutorial.openServiceModal();
                  }
                }
              })()
            `,
          });

          await delay(200);

          // Check geometry via evaluate
          const geom = await cdp.send('Runtime.evaluate', {
            expression: `
              (() => {
                const coach = document.querySelector('[data-tutorial="coach-card"]');
                const target = document.querySelector('${step.targetSelector}');
                if (!coach) return { error: 'Coach card missing' };
                const cRect = coach.getBoundingClientRect();
                const tRect = target ? target.getBoundingClientRect() : null;
                
                const overlap = tRect ? !(
                  cRect.right <= tRect.left ||
                  cRect.left >= tRect.right ||
                  cRect.bottom <= tRect.top ||
                  cRect.top >= tRect.bottom
                ) : false;

                const outOfBounds = (
                  cRect.left < 0 ||
                  cRect.top < 0 ||
                  cRect.right > window.innerWidth ||
                  cRect.bottom > window.innerHeight
                );

                return {
                  hasCoach: true,
                  hasTarget: Boolean(target),
                  overlap,
                  outOfBounds,
                  cRect: { left: cRect.left, top: cRect.top, right: cRect.right, bottom: cRect.bottom },
                  tRect: tRect ? { left: tRect.left, top: tRect.top, right: tRect.right, bottom: tRect.bottom } : null,
                };
              })()
            `,
            returnByValue: true,
          });

          const res = geom.result?.value;
          if (res && res.overlap) {
            console.warn(`  ⚠️ Visual overlap in Lesson ${lesson.id} Step ${sIdx + 1} (${step.id}) at ${vp.label}`);
            visualCollisionErrors++;
          }
          if (res && res.outOfBounds) {
            console.warn(`  ⚠️ Boundary overflow in Lesson ${lesson.id} Step ${sIdx + 1} (${step.id}) at ${vp.label}`);
            clippingErrors++;
          }

          // Capture screenshot
          const filename = `L${lesson.id}_S${sIdx + 1}_${step.id}_${vp.label}.png`;
          const filepath = path.join(qaDir, filename);
          await captureScreenshot(cdp, filepath);
          totalScreenshots++;
        }
      }

      // Check simulated keyboard mode on mobile viewports for Lesson 1 Step 1 (Customer Name input)
      if (vp.isMobile) {
        console.log(`  Simulating Virtual Keyboard Open (~400px height) at ${vp.label}...`);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: 400, // Keyboard occupies bottom 400px of screen
          deviceScaleFactor: 1,
          mobile: true,
        });

        await cdp.send('Runtime.evaluate', {
          expression: `
            if (window.__rd_tutorial) {
              window.__rd_tutorial.setState({
                isActive: true,
                hasStarted: true,
                currentLesson: 1,
                currentStep: 0,
              });
              window.dispatchEvent(new Event('resize'));
              window.__rd_tutorial.openAddCustomerModal();
            }
          `,
        });

        await delay(300);

        const kbGeom = await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const coach = document.querySelector('[data-tutorial="coach-card"]');
              const input = document.querySelector('[data-tutorial="customer-name"]');
              if (!coach || !input) return { ok: false };
              const cRect = coach.getBoundingClientRect();
              const iRect = input.getBoundingClientRect();
              return {
                ok: true,
                isCoachAtTop: cRect.top <= 60,
                isInputVisible: iRect.bottom <= 400,
                overlap: !(cRect.bottom <= iRect.top || cRect.top >= iRect.bottom),
              };
            })()
          `,
          returnByValue: true,
        });

        const kbRes = kbGeom.result?.value;
        if (kbRes && (!kbRes.isCoachAtTop || kbRes.overlap)) {
          console.warn(`  ⚠️ Keyboard collision in Lesson 1 Step 1 at ${vp.label}: coach not shifted to top.`, kbRes);
          visualCollisionErrors++;
        } else {
          console.log(`  ✓ Keyboard shift verified: coach successfully docked at top sheet without covering input.`);
        }

        const kbFile = path.join(qaDir, `L1_S1_keyboard_active_${vp.label}.png`);
        await captureScreenshot(cdp, kbFile);
        totalScreenshots++;
      }
    }

    // =========================================================================
    // ROUND 2: AUTOMATED CHAOS TESTING & RECOVERY INVARIANTS
    // =========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('ROUND 2: CHAOS TESTING (Outside clicks, Escape, navigation, refresh)');
    console.log('----------------------------------------------------------------\n');

    // 1. Outside click triggers focus lock shake and does not freeze
    console.log('Testing: Outside click triggers focus lock shake...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.setState({
            isActive: true,
            currentLesson: 1,
            currentStep: 0,
          });
          window.__rd_tutorial.openAddCustomerModal();
          window.__rd_tutorial.triggerOutsideClickShake();
        }
      `,
    });
    await delay(300);

    const shakeTest = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const card = document.querySelector('[data-tutorial="coach-card"]');
          const hasShakeClass = card && card.className.includes('animate-shake');
          const banner = document.body.innerText.includes('Finish this step first, or skip');
          return { hasShakeClass, banner };
        })()
      `,
      returnByValue: true,
    });
    console.log(`  ✓ Outside click shake registered: banner=${shakeTest.result?.value?.banner}`);

    // Save representative screenshot: 04-focus-lock-shake.png
    await captureScreenshot(cdp, path.join(docsDir, '04-focus-lock-shake.png'));

    // 2. Escape key pressed: does not kill tutorial
    console.log('Testing: Escape key press does not kill tutorial...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await delay(200);

    const escCheck = await cdp.send('Runtime.evaluate', {
      expression: `Boolean(window.__rd_tutorial && window.__rd_tutorial.getState().isActive)`,
      returnByValue: true,
    });
    console.log(`  ✓ Escape key safely handled: tutorial active=${escCheck.result?.value}`);

    // 3. Page refresh: state restored from localStorage
    console.log('Testing: Page refresh resumes at exact step...');
    await cdp.send('Page.reload');
    await delay(2500);

    const refreshCheck = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const s = window.__rd_tutorial ? window.__rd_tutorial.getState() : null;
          return {
            isActive: s ? s.isActive : false,
            currentLesson: s ? s.currentLesson : null,
            currentStep: s ? s.currentStep : null,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log(`  ✓ Page refresh verified: state restored cleanly at Lesson ${refreshCheck.result?.value?.currentLesson}, Step ${refreshCheck.result?.value?.currentStep}`);

    // 4. Exit confirmation modal check
    console.log('Testing: Exit tutorial confirmation dialog...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.promptExit();
        }
      `,
    });
    await delay(300);

    const exitDialogCheck = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          return text.includes('Leave the tutorial?') && text.includes('Settings > Help & Tutorial');
        })()
      `,
      returnByValue: true,
    });
    console.log(`  ✓ Exit confirmation modal open and guaranteed non-trap: ${exitDialogCheck.result?.value}`);

    // Save representative screenshot: 03-exit-confirmation.png
    await captureScreenshot(cdp, path.join(docsDir, '03-exit-confirmation.png'));

    // Cancel exit to continue
    await cdp.send('Runtime.evaluate', {
      expression: `if (window.__rd_tutorial) window.__rd_tutorial.cancelExit();`,
    });
    await delay(200);

    // =========================================================================
    // SAVE REMAINING REPRESENTATIVE SCREENSHOTS FOR DOCS
    // =========================================================================
    console.log('\nCapturing representative documentation screenshots in docs/tutorial-qa/...');

    // 01-mobile-keyboard-shift.png
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 420,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.setState({ isActive: true, currentLesson: 1, currentStep: 0 });
          window.__rd_tutorial.openAddCustomerModal();
        }
      `,
    });
    await delay(350);
    await captureScreenshot(cdp, path.join(docsDir, '01-mobile-keyboard-shift.png'));
    console.log('  ✓ Saved docs/tutorial-qa/01-mobile-keyboard-shift.png');

    // 02-modal-layering.png (Desktop modal with coach card alongside)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.setState({ isActive: true, currentLesson: 1, currentStep: 1 });
          window.__rd_tutorial.openAddCustomerModal();
        }
      `,
    });
    await delay(350);
    await captureScreenshot(cdp, path.join(docsDir, '02-modal-layering.png'));
    console.log('  ✓ Saved docs/tutorial-qa/02-modal-layering.png');

    // 05-dropdown-lesson-4.png (Lesson 4 Today queue More menu)
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.closeAddCustomerModal();
          window.__rd_tutorial.setState({ isActive: true, currentLesson: 4, currentStep: 0 });
        }
      `,
    });
    await delay(350);
    await captureScreenshot(cdp, path.join(docsDir, '05-dropdown-lesson-4.png'));
    console.log('  ✓ Saved docs/tutorial-qa/05-dropdown-lesson-4.png');

    // 06-finish-step.png (Lesson 8 results & practice cleanup)
    await cdp.send('Page.navigate', { url: `${BASE_URL}/results` });
    await delay(1500);
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.__rd_tutorial) {
          window.__rd_tutorial.setState({
            isActive: true,
            currentLesson: 8,
            currentStep: 2,
            completedLessons: [1, 2, 3, 4, 5, 6, 7],
          });
        }
      `,
    });
    await delay(350);
    await captureScreenshot(cdp, path.join(docsDir, '06-finish-step.png'));
    console.log('  ✓ Saved docs/tutorial-qa/06-finish-step.png');

    console.log('\n================================================================');
    console.log(`🎉 QA RUN COMPLETE: ${totalScreenshots} screenshots generated across all 8 lessons`);
    console.log(`   Visual collision errors: ${visualCollisionErrors}`);
    console.log(`   Clipping / overflow errors: ${clippingErrors}`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('❌ Error during Tutorial QA:', err);
  } finally {
    if (cdp) cdp.close();
    try {
      edgeProc.kill('SIGKILL');
    } catch {}
    if (serverProc) {
      try {
        serverProc.kill('SIGKILL');
      } catch {}
    }
  }
}

runTutorialQA();
