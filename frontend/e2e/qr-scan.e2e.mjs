/**
 * Smoke test: pindai QR valid -> banner muncul dan baris ter-sorot.
 *
 * Prasyarat:
 *   - backend jalan di API_URL (default http://127.0.0.1:5000/api)
 *   - frontend ter-serve di FRONTEND_URL (default http://127.0.0.1:4173)
 *     cara mudah: cd frontend; npm run build; node serve-online.mjs
 *
 * Jalankan: node e2e/qr-scan.e2e.mjs
 */
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ACCOUNTS, check, firstComponent, login, openBrowser, report } from './helpers.mjs';

const auth = await login(ACCOUNTS.admin);
const component = await firstComponent(auth.token);
console.log(`LOGIN=OK user=${auth.user.username} role=${auth.user.role}`);
console.log(`TARGET=${component.name} (${component.inventoryCode})`);

const page = await openBrowser('qr-scan');
let allPass = false;

try {
  await page.goto(`/inventory?component=${component.id}`, auth);

  const state = await page.eval(
    `JSON.stringify({
      url: location.href,
      banner: document.body.innerText.includes('Hasil pindai QR'),
      ring: !!document.querySelector('tbody tr.ring-2'),
      btnQR: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.includes('Unduh QR')).length,
      btnTutup: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.trim() === 'Tutup').length,
      filterVal: (document.querySelector('input[placeholder^="Cari"]') || {}).value || ''
    })`,
    true
  );

  console.log(`URL_AKHIR=${state.url}`);

  allPass = report('QR scan (admin)', {
    banner: check('banner muncul', state.banner, true),
    ring: check('baris ter-sorot', state.ring, true),
    btnQR: check('tombol Unduh QR', state.btnQR, 1),
    btnTutup: check('tombol Tutup', state.btnTutup, 1),
    filterVal: check('filter terisi kode inventori', state.filterVal, component.inventoryCode),
    url: check('query sudah dilucuti', state.url, (u) => !u.includes('component='))
  });

  const shot = await page.screenshot(join(tmpdir(), 'ilms-qr-scan.png'));
  if (shot) console.log(`SCREENSHOT=${shot}`);
} finally {
  await page.close();
}

console.log(`\nHASIL=${allPass ? 'LULUS' : 'GAGAL'}`);
process.exit(allPass ? 0 : 1);