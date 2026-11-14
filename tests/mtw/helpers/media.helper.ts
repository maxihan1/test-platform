import type { Page } from '@playwright/test';

export interface 올릴파일 {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export async function PNG만들기(page: Page, 이름: string, 가로 = 64, 세로 = 64, 잡음 = false): Promise<올릴파일> {
  const 글 = await page.evaluate(
    ({ w, h, n }) => {
      const 판 = document.createElement('canvas');
      판.width = w;
      판.height = h;
      const 붓 = 판.getContext('2d');
      if (붓 === null) throw new Error('canvas 를 못 만들었다');
      const 그림 = 붓.createImageData(w, h);
      for (let i = 0; i < 그림.data.length; i += 4) {
        그림.data[i] = n ? Math.floor(Math.random() * 256) : (i / 4) % 256;
        그림.data[i + 1] = n ? Math.floor(Math.random() * 256) : 120;
        그림.data[i + 2] = n ? Math.floor(Math.random() * 256) : 200;
        그림.data[i + 3] = 255;
      }
      붓.putImageData(그림, 0, 0);
      return 판.toDataURL('image/png').split(',')[1] ?? '';
    },
    { w: 가로, h: 세로, n: 잡음 },
  );
  return { name: 이름, mimeType: 'image/png', buffer: Buffer.from(글, 'base64') };
}

export function 가짜영상(이름: string): 올릴파일 {
  return { name: 이름, mimeType: 'video/mp4', buffer: Buffer.from('00000018667479706d703432', 'hex') };
}

export function CSV만들기(이름: string, 줄들: string[]): 올릴파일 {
  return { name: 이름, mimeType: 'text/csv', buffer: Buffer.from(줄들.join('\n'), 'utf8') };
}
