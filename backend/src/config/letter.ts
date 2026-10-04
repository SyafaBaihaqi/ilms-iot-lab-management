/**
 * Identitas laboratory untuk kop laporan dan surat peminjaman.
 * Semua nilai bisa dioverride lewat environment variable supaya
 * tidak perlu mengubah kode saat dipindah ke server produksi.
 */
export const LETTER_CONFIG = {
  institutionName: process.env.LETTER_INSTITUTION || 'Laboratorium Teknik Elektro',
  institutionAddress: process.env.LETTER_ADDRESS || 'Alamat laboratorium, Indonesia',
  letterPrefix: process.env.LETTER_PREFIX || 'SP/LAB',
  headTitle: process.env.LETTER_HEAD_TITLE || 'Kepala Laboratorium',
  headName: process.env.LETTER_HEAD_NAME || '..............................',
  signatureTitle: process.env.LETTER_SIGNATURE_TITLE || 'Dosen Pengampu'
};

export const toRoman = (value: number): string => {
  const map: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];
  let rest = Math.max(0, Math.floor(value));
  let out = '';
  for (const [amount, symbol] of map) {
    while (rest >= amount) {
      out += symbol;
      rest -= amount;
    }
  }
  return out || '0';
};

export const formatDateID = (value: Date | string | null | undefined): string => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const formatNumberID = (value: number): string =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value) || 0);