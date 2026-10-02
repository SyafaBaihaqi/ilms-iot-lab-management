/**
 * Uji hak akses per peran di sisi browser: isi sidebar dan route guard.
 *
 * Akun pengujian dibuat manual lebih dulu lewat API (role Dosen dan
 * Mahasiswa tidak di-seed), lalu kredensialnya diberikan lewat env:
 *
 *   $env:DOSEN_USER="dosen_xxx"; $env:DOSEN_PASS="dosen12345"
 *   $env:MAHS_USER="mhs_xxx";   $env:MAHS_PASS="user12345"
 *   node e2e/role-access.e2e.mjs
 *
 * Jalankan: node e2e/role-access.e2e.mjs
 */
import { ACCOUNTS, check, login, openBrowser, report } from './helpers.mjs';

const DOSEN = {
  username: process.env.DOSEN_USER || 'dosen1',
  password: process.env.DOSEN_PASS || 'dosen123'
};
const MAHASISWA = {
  username: process.env.MAHS_USER || 'mhs1',
  password: process.env.MAHS_PASS || 'user12345'
};

const STAFF_MENU = ['Dashboard', 'Kategori', 'Perangkat IoT', 'Monitoring Sensor', 'Laporan'];
const SHARED_MENU = ['Inventori', 'Peminjaman', 'Customer Service'];
const ADMIN_ONLY_MENU = ['Pengguna', 'Log Audit'];

const MENU_STATE = `JSON.stringify({
  menu: Array.from(document.querySelectorAll('aside a, nav a')).map((a) => a.textContent.trim()),
  url: location.href,
  heading: (document.querySelector('main h2') || {}).innerText || ''
})`;

async function cekPeran(label, account, port, expectMenu, expectHidden, allowReports) {
  const auth = await login(account);
  console.log(`\nROLE=${auth.user.role} user=${auth.user.username}`);
  const page = await openBrowser(label, { port });
  try {
    await page.goto('/', auth);
    const state = await page.eval(MENU_STATE, true);
    const menu = state.menu.join('|');

    const checks = {};
    for (const item of expectMenu) {
      checks[`menu "${item}" tampil`] = check(item, menu.includes(item), true);
    }
    for (const item of expectHidden) {
      checks[`menu "${item}" disembunyikan`] = check(item, menu.includes(item), false);
    }

    // Route guard: halaman admin-only harus balik ke dashboard/inventori.
    await page.goto('/users', auth);
    const afterUsers = await page.eval(MENU_STATE, true);
    checks['route /users dialihkan'] = check('url', afterUsers.url, (u) => !u.endsWith('/users'));

    await page.goto('/reports', auth);
    const afterReports = await page.eval(MENU_STATE, true);
    checks['route /reports sesuai hak akses'] = check('url', afterReports.url, (u) =>
      allowReports ? u.endsWith('/reports') : !u.endsWith('/reports')
    );

    return report(label, checks);
  } finally {
    await page.close();
  }
}

let allPass = true;

allPass =
  (await cekPeran('dosen', DOSEN, 9310, [...STAFF_MENU, ...SHARED_MENU], ADMIN_ONLY_MENU, true)) &&
  allPass;

allPass =
  (await cekPeran(
    'mahasiswa',
    MAHASISWA,
    9311,
    SHARED_MENU,
    [...STAFF_MENU, ...ADMIN_ONLY_MENU],
    false
  )) && allPass;

console.log(`\nHASIL=${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}`);
process.exit(allPass ? 0 : 1);