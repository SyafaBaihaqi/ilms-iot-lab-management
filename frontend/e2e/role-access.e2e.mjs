/**
 * Uji hak akses per peran di sisi browser: isi sidebar, route guard, dan
 * dashboard yang sesuai peran.
 *
 * Akun pengujian dibuat manual lebih dulu lewat API (role Dosen, Mahasiswa,
 * dan User tidak di-seed), lalu kredensialnya diberikan lewat env:
 *
 *   $env:DOSEN_USER="dosen_xxx"; $env:DOSEN_PASS="dosen12345"
 *   $env:MAHS_USER="mhs_xxx";   $env:MAHS_PASS="user12345"
 *   $env:USER_USER="user_xxx";  $env:USER_PASS="user12345"
 *   node e2e/role-access.e2e.mjs
 *
 * Jalankan: node e2e/role-access.e2e.mjs
 */
import { check, login, openBrowser, report } from './helpers.mjs';

const DOSEN = {
  username: process.env.DOSEN_USER || 'dosen1',
  password: process.env.DOSEN_PASS || 'dosen123'
};
const MAHASISWA = {
  username: process.env.MAHS_USER || 'mhs1',
  password: process.env.MAHS_PASS || 'user12345'
};
const USER = {
  username: process.env.USER_USER || 'mahasiswa1',
  password: process.env.USER_PASS || 'user123'
};

const DASHBOARD = 'Dashboard';
const STAFF_PAGES = ['Kategori', 'Perangkat IoT', 'Monitoring Sensor', 'Laporan'];
const SHARED_PAGES = ['Inventori', 'Peminjaman', 'Customer Service'];
const ADMIN_ONLY_MENU = ['Pengguna', 'Log Audit'];

const MENU_STATE = `JSON.stringify({
  menu: Array.from(document.querySelectorAll('aside a, nav a')).map((a) => a.textContent.trim()),
  url: location.href,
  heading: (document.querySelector('main h2') || {}).innerText || ''
})`;

async function cekPeran({ label, account, port, dashboardHeading, expectMenu, expectHidden, allowReports }) {
  const auth = await login(account);
  console.log(`\nROLE=${auth.user.role} user=${auth.user.username}`);
  const page = await openBrowser(label, { port });
  try {
    await page.goto('/', auth);
    const state = await page.eval(MENU_STATE, true);
    const menu = state.menu.join('|');

    const checks = {};
    checks[`dashboard "${dashboardHeading}" tampil`] = check('heading', state.heading.trim(), dashboardHeading);

    for (const item of expectMenu) {
      checks[`menu "${item}" tampil`] = check(item, menu.includes(item), true);
    }
    for (const item of expectHidden) {
      checks[`menu "${item}" disembunyikan`] = check(item, menu.includes(item), false);
    }

    // Route guard: halaman admin-only harus dialihkan keluar.
    await page.goto('/users', auth);
    const afterUsers = await page.eval(MENU_STATE, true);
    checks['route /users dialihkan'] = check('url', afterUsers.url, (u) => !u.endsWith('/users'));

    await page.goto('/reports', auth);
    const afterReports = await page.eval(MENU_STATE, true);
    checks['route /reports sesuai hak akses'] = check('url', afterReports.url, (u) =>
      allowReports ? u.endsWith('/reports') : !u.endsWith('/reports')
    );

    // Dashboard harus tetap bisa dibuka ulang setelah redirect.
    await page.goto('/', auth);
    const backHome = await page.eval(MENU_STATE, true);
    checks['dashboard tetap tampil setelah redirect'] = check('heading', backHome.heading.trim(), dashboardHeading);

    return report(label, checks);
  } finally {
    await page.close();
  }
}

let allPass = true;

allPass =
  (await cekPeran({
    label: 'dosen',
    account: DOSEN,
    port: 9310,
    dashboardHeading: 'Dashboard Laboratorium',
    expectMenu: [DASHBOARD, ...STAFF_PAGES, ...SHARED_PAGES],
    expectHidden: ADMIN_ONLY_MENU,
    allowReports: true
  })) && allPass;

allPass =
  (await cekPeran({
    label: 'mahasiswa',
    account: MAHASISWA,
    port: 9311,
    dashboardHeading: 'Dashboard Mahasiswa',
    expectMenu: [DASHBOARD, ...SHARED_PAGES],
    expectHidden: [...STAFF_PAGES, ...ADMIN_ONLY_MENU],
    allowReports: false
  })) && allPass;

allPass =
  (await cekPeran({
    label: 'user',
    account: USER,
    port: 9312,
    dashboardHeading: 'Dashboard',
    expectMenu: [DASHBOARD, ...SHARED_PAGES],
    expectHidden: [...STAFF_PAGES, ...ADMIN_ONLY_MENU],
    allowReports: false
  })) && allPass;

console.log(`\nHASIL=${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}`);
process.exit(allPass ? 0 : 1);