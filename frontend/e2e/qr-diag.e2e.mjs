/**
 * Alat diagnosa: dump seluruh isi halaman, error jaringan, dan log konsol.
 * Pakai saat ada yang tidak beres tapi assertion skenario lolos.
 *
 * Jalankan: node e2e/qr-diag.e2e.mjs
 */
import { ACCOUNTS, firstComponent, login, openBrowser } from './helpers.mjs';

const auth = await login(ACCOUNTS.admin);
const component = await firstComponent(auth.token);

const page = await openBrowser('qr-diag', { port: 9304 });

try {
  await page.send('Log.enable');
  await page.send('Network.enable');
  await page.goto(`/inventory?component=${component.id}`, auth);

  const state = await page.eval(
    `JSON.stringify({
      url: location.href,
      hasMain: !!document.querySelector('main'),
      serviceWorker: navigator.serviceWorker
        ? (navigator.serviceWorker.controller ? 'controller=ada' : 'controller=tidak')
        : 'sw=tidak',
      text: document.body.innerText
    })`,
    true
  );

  console.log(`URL_AKHIR=${state.url}`);
  console.log(`MAIN=${state.hasMain}  SW=${state.serviceWorker}`);
  console.log('\n--- ISI HALAMAN ---');
  console.log(state.text);

  const problems = [];
  for (const ev of page.events) {
    if (ev.method === 'Network.loadingFailed') {
      problems.push(`GAGAL: ${ev.params.errorText} (${ev.params.type})`);
    }
    if (ev.method === 'Network.responseReceived' && ev.params.response.status >= 400) {
      problems.push(`HTTP ${ev.params.response.status} ${ev.params.response.url}`);
    }
    if (ev.method === 'Runtime.exceptionThrown') {
      problems.push(`EXCEPTION: ${ev.params.exceptionDetails?.exception?.description || ev.params.exceptionDetails?.text}`);
    }
    if (ev.method === 'Runtime.consoleAPICalled') {
      const text = ev.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
      problems.push(`CONSOLE[${ev.params.type}]: ${text}`);
    }
    if (ev.method === 'Log.entryAdded') {
      problems.push(`LOG[${ev.params.entry.level}]: ${ev.params.entry.text} ${ev.params.entry.url || ''}`);
    }
  }

  console.log('\n--- MASALAH JARINGAN / KONSOL ---');
  console.log(problems.length ? problems.join('\n') : 'tidak ada');
} finally {
  await page.close();
}