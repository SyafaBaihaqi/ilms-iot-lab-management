import QRCode from 'qrcode';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

export interface QrPayload {
  url: string;
  text: string;
}

export class QrCodeService {
  /** URL halaman frontend yang akan dibuka ketika QR dipindai. */
  static buildComponentUrl(componentId: string): string {
    return `${FRONTEND_URL}/inventory?component=${encodeURIComponent(componentId)}`;
  }

  static buildComponentPayload(component: { id: string; inventoryCode: string; name: string }): QrPayload {
    const url = this.buildComponentUrl(component.id);
    return { url, text: url };
  }

  static async toPng(text: string, size = 320): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      type: 'png',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  }

  static async toSvg(text: string, size = 320): Promise<string> {
    return QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  }
}
