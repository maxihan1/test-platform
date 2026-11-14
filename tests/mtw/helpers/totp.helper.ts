import type { Page } from '@playwright/test';

export async function 인증코드(page: Page, 비밀값: string): Promise<string> {
  return page.evaluate(async (값) => {
    const 글자 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const 깨끗 = 값.replace(/[\s=]/g, '').toUpperCase();
    let 비트 = '';
    for (const c of 깨끗) 비트 += 글자.indexOf(c).toString(2).padStart(5, '0');
    const 바이트 = new Uint8Array(Math.floor(비트.length / 8));
    for (let i = 0; i < 바이트.length; i++) 바이트[i] = parseInt(비트.slice(i * 8, i * 8 + 8), 2);
    const 칸 = Math.floor(Date.now() / 1000 / 30);
    const 수 = new Uint8Array(8);
    new DataView(수.buffer).setUint32(4, 칸);
    const 열쇠 = await crypto.subtle.importKey('raw', 바이트, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const 서명 = new Uint8Array(await crypto.subtle.sign('HMAC', 열쇠, 수));
    const 자리 = (서명[19] ?? 0) & 0xf;
    const 코드 = (((서명[자리] ?? 0) & 0x7f) << 24) | ((서명[자리 + 1] ?? 0) << 16) | ((서명[자리 + 2] ?? 0) << 8) | (서명[자리 + 3] ?? 0);
    return String(코드 % 1_000_000).padStart(6, '0');
  }, 비밀값);
}
