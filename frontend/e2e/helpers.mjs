import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const APP = (process.env.FRONTEND_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
export const API = (process.env.API_URL || 'http://127.0.0.1:5000/api').replace(/\/+$/, '');

export const ACCOUNTS = {
  admin: { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'admin123' },
  user: { username: process.env.USER_USER || 'mahasiswa1', password: process.env.USER_PASS || 'user123' }
};

const BROWSER_CANDIDATES = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    'Browser headless tidak ditemukan. Set EDGE_PATH, contoh:\n' +
    '  $env:EDGE_PATH="C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"'
  );
}

export async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function login(account) {
  const body = await fetchJson(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(account)
  });
  if (!body?.data?.accessToken) throw new Error('Login gagal: token tidak diterima');
  return { token: body.data.accessToken, user: body.data.user };
}

/** Id komponen pertama, supaya skenario tidak memakai UUID yang ditulis manual. */
export async function firstComponent(token) {
  const body = await fetchJson(`${API}/components?limit=1&page=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const item = body?.data?.items?.[0];
  if (!item?.id) throw new Error('Belum ada komponen di database. Jalankan seed dulu.');
  return item;
}

async function waitForCdp(port, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    await sleep(500);
    try {
      const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      if (version?.webSocketDebuggerUrl) return;
    } catch {
      // belum siap
    }
  }
  throw new Error(`CDP tidak merespons di port ${port}`);
}

/**
 * Buka browser headless + sesi CDP.
 * Mengembalikan evaluate(), navigate(), screenshot(), dan close().
 */
export async function openBrowser(label, { port = 9300 } = {}) {
  const binary = findBrowser();
  const profile = join(tmpdir(), `ilms-e2e-${label}`);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });

  const proc = spawn(
    binary,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1400,1000',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  let session;
  try {
    await waitForCdp(port);
    const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(APP + '/')}`, {
      method: 'PUT'
    });

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('WebSocket CDP gagal dibuka'));
    });

    let seq = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
        return;
      }
      events.push(msg);
    };

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');

    session = {
      events,
      send,

      /** Navigasi, tunggu render, lalu seed token auth di localStorage. */
      async goto(path, auth) {
        await send('Page.navigate', { url: APP + path });
        await sleep(1200);
        if (auth) {
          await session.eval(`
            localStorage.setItem('ilms_access_token', ${JSON.stringify(auth.token)});
            localStorage.setItem('ilms_user', ${JSON.stringify(JSON.stringify(auth.user))});
            true;
          `);
        }
        await send('Page.navigate', { url: APP + path });
        await sleep(2500);
      },

      /** Jalankan ekspresi, kembalikan nilainya (atau objek bila askJson). */
      async eval(expression, askJson = false) {
        const msg = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (msg.result?.exceptionDetails) {
          throw new Error('Evaluate gagal: ' + (msg.result.exceptionDetails.text || 'unknown'));
        }
        const value = msg.result?.result?.value;
        return askJson ? JSON.parse(value || '{}') : value;
      },

      async screenshot(file) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        if (shot.result?.data) {
          const { writeFileSync } = await import('node:fs');
          writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
          return file;
        }
        return null;
      },

      async close() {
        try {
          ws.close();
        } catch {
          // abaikan
        }
        proc.kill();
        await sleep(500);
      }
    };

    return session;
  } catch (err) {
    proc.kill();
    throw err;
  }
}

/** Format hasil assertion yang enak dibaca terminal. */
export function report(title, checks) {
  console.log(`\n### ${title}`);
  let allPass = true;
  for (const [name, result] of Object.entries(checks)) {
    const { got, expect, pass } = result;
    if (!pass) allPass = false;
    console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name}: harap=${expect} dapat=${JSON.stringify(got)}`);
  }
  return allPass;
}

export function check(name, got, expected) {
  const pass = typeof expected === 'function' ? !!expected(got) : JSON.stringify(got) === JSON.stringify(expected);
  return { got, expect: expected, pass };
}