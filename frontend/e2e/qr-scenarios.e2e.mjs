/**
 * Skenario lengkap fitur pindai QR inventori:
 *   1. tanpa param          -> banner absen, tabel normal (regresi)
 *   2. QR valid (user)      -> banner, sorot baris, filter, tombol sesuai peran
 *   3. QR id tidak dikenal  -> pesan error Indonesia, tabel tetap normal
 *
 * Jalankan: node e2e/qr-scenarios.e2e.mjs
 */
import { ACCOUNTS, check, firstComponent, login, openBrowser, report } from './helpers.mjs';

const admin = await login(ACCOUNTS.admin);
const component = await firstComponent(admin.token);
const INVALID_ID = '00000000-0000-0000-0000-000000000000';

const PAGE_STATE = `JSON.stringify({
  url: location.href,
  banner: document.body.innerText.includes('Hasil pindai QR'),
  ring: !!document.querySelector('tbody tr.ring-2'),
  btnQR: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.includes('Unduh QR')).length,
  btnEdit: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.trim() === 'Edit' && b.closest('.border-blue-200')).length,
  btnTutup: Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.trim() === 'Tutup').length,
  errTxt: (document.querySelector('.bg-red-50') || {}).innerText || '',
  rows: document.querySelectorAll('tbody tr').length,
  filterVal: (document.querySelector('input[placeholder^="Cari"]') || {}).value || ''
})`;

async function scenario(label, account, path, buildChecks, port) {
  const auth = await login(account);
  const page = await openBrowser(label, { port });
  try {
    await page.goto(path, auth);
    const state = await page.eval(PAGE_STATE, true);
    console.log(`\nDATA=${JSON.stringify(state)}`);
    return report(`${label} (${auth.user.username}/${auth.user.role})`, buildChecks(state));
  } finally {
    await page.close();
  }
}

console.log(`TARGET=${component.name} (${component.inventoryCode})`);

let allPass = true;

allPass =
  (await scenario(
    'tanpa-param',
    ACCOUNTS.admin,
    '/inventory',
    (s) => ({
      banner: check('banner absen', s.banner, false),
      ring: check('tidak ada sorot', s.ring, false),
      btnTutup: check('tidak ada tombol Tutup', s.btnTutup, 0),
      filterVal: check('filter tetap kosong', s.filterVal, '')
    }),
    9301
  )) && allPass;

allPass =
  (await scenario(
    'user-qr',
    ACCOUNTS.user,
    `/inventory?component=${component.id}`,
    (s) => ({
      banner: check('banner muncul', s.banner, true),
      ring: check('baris ter-sorot', s.ring, true),
      rows: check('tabel tersaring ke 1 baris', s.rows, 1),
      filterVal: check('filter terisi kode inventori', s.filterVal, component.inventoryCode),
      btnQR: check('tombol Unduh QR ada', s.btnQR, 1),
      btnTutup: check('tombol Tutup ada', s.btnTutup, 1),
      btnEdit: check('tombol Edit disembunyikan untuk user', s.btnEdit, 0),
      url: check('query sudah dilucuti', s.url, (u) => !u.includes('component='))
    }),
    9302
  )) && allPass;

allPass =
  (await scenario(
    'qr-tidak-dikenal',
    ACCOUNTS.user,
    `/inventory?component=${INVALID_ID}`,
    (s) => ({
      banner: check('banner absen', s.banner, false),
      ring: check('tidak ada sorot', s.ring, false),
      errTxt: check('pesan error Indonesia tampil', s.errTxt, (t) => t.includes('tidak ditemukan')),
      rows: check('tabel tetap normal', s.rows, 10),
      filterVal: check('filter tetap kosong', s.filterVal, '')
    }),
    9303
  )) && allPass;

console.log(`\nHASIL=${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}`);
process.exit(allPass ? 0 : 1);