// 실시간 장면의 요소 윤곽 — 자리를 장면 비율로 바꾸고, 바뀔 때만 .box 파일에 쓰고, 폰은 같은 요소를 다시 안 묻는지 본다 (SPEC 도메인/러너 §5.2 「요소 윤곽」)

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 비율로, 상자쓰개, 웹요소따라가기, 폰상자읽개 } from './liveBox.js';

const 지금칸 = Symbol.for('platform.kit.지금요소');
const 다룬다 = (요소: unknown): void => {
  (globalThis as Record<symbol, unknown>)[지금칸] = 요소;
};

let 폴더 = '';
// 비율은 나눗셈이라 0.2 가 0.19999… 로 온다
const 근사 = (x: number, y: number, w: number, h: number) => ({ x: expect.closeTo(x, 6), y: expect.closeTo(y, 6), w: expect.closeTo(w, 6), h: expect.closeTo(h, 6) });

afterEach(() => {
  다룬다(undefined);
  if (폴더 !== '') rmSync(폴더, { recursive: true, force: true });
  폴더 = '';
});

describe('비율로', () => {
  it('창 크기에 대한 비율로 바꾸고 화면 밖으로 나간 쪽은 자른다', () => {
    expect(비율로({ x: 100, y: 50, width: 200, height: 100 }, { width: 1000, height: 500 })).toEqual(근사(0.1, 0.1, 0.2, 0.2));
    expect(비율로({ x: -100, y: 400, width: 300, height: 200 }, { width: 1000, height: 500 })).toEqual(근사(0, 0.8, 0.2, 0.2));
  });

  it('다 나갔거나 크기가 없으면 윤곽이 없다', () => {
    expect(비율로({ x: 0, y: 600, width: 10, height: 10 }, { width: 1000, height: 500 })).toBeNull();
    expect(비율로({ x: 10, y: 10, width: 0, height: 10 }, { width: 1000, height: 500 })).toBeNull();
    expect(비율로({ x: 10, y: 10, width: 10, height: 10 }, { width: 0, height: 0 })).toBeNull();
  });
});

describe('상자쓰개', () => {
  it('비율 넷을 쓰고, 없으면 파일을 지우고, 닫으면 더 안 쓴다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'kit-box-'));
    const 장면 = join(폴더, 'a.jpg');
    const 쓰개 = 상자쓰개(장면);

    await 쓰개.쓴다({ x: 0.1, y: 0.2, w: 0.3, h: 0.04 });
    expect(readFileSync(`${장면}.box`, 'utf8')).toBe('0.1000,0.2000,0.3000,0.0400');
    await 쓰개.쓴다(null);
    expect(existsSync(`${장면}.box`)).toBe(false);

    await 쓰개.닫기();
    await 쓰개.쓴다({ x: 0, y: 0, w: 1, h: 1 });
    expect(existsSync(`${장면}.box`)).toBe(false);
  });
});

// PNG 머리만 있는 장면 — 가로 · 세로는 IHDR 자리(16 · 20바이트)에 있다
const png = (width: number, height: number): Buffer => {
  const 장 = Buffer.alloc(24);
  장[0] = 0x89;
  장.writeUInt32BE(width, 16);
  장.writeUInt32BE(height, 20);
  return 장;
};

describe('폰상자읽개', () => {
  it('장면마다 요소 자리를 다시 읽고(스크롤 · 키보드로 움직인다) 창 크기는 장면 크기가 바뀔 때만 묻는다', async () => {
    const getElementRect = vi.fn().mockResolvedValueOnce({ x: 108, y: 240, width: 540, height: 120 }).mockResolvedValueOnce({ x: 108, y: 480, width: 540, height: 120 });
    const getWindowRect = vi.fn(async () => ({ width: 1080, height: 2274 }));
    const 읽기 = 폰상자읽개({ getElementRect, getWindowRect });

    다룬다('el-1');
    expect(await 읽기(png(1080, 2400))).toEqual(근사(0.1, 0.1, 0.5, 0.05));
    expect(await 읽기(png(1080, 2400))).toEqual(근사(0.1, 0.2, 0.5, 0.05));
    expect(getElementRect).toHaveBeenCalledTimes(2);
    expect(getWindowRect).toHaveBeenCalledTimes(1);
  });

  it('세로는 창 높이가 아니라 장면 높이로 나눈다 — 창이 시스템 막대를 빼고 와도 아래로 밀리지 않는다', async () => {
    const 읽기 = 폰상자읽개({ getElementRect: async () => ({ x: 0, y: 2000, width: 1080, height: 200 }), getWindowRect: async () => ({ width: 1080, height: 2274 }) });

    다룬다('el-bottom');
    expect(await 읽기(png(1080, 2400))).toEqual(근사(0, 2000 / 2400, 1, 200 / 2400));
  });

  it('요소가 없거나(찾는 중 · 게임) 사라졌거나 PNG 가 아니면 윤곽이 없다', async () => {
    const 읽기 = 폰상자읽개({ getElementRect: async () => Promise.reject(new Error('stale')), getWindowRect: async () => ({ width: 1, height: 1 }) });

    expect(await 읽기(png(1, 1))).toBeNull();
    다룬다('el-gone');
    expect(await 읽기(png(1, 1))).toBeNull();
    expect(await 읽기(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('웹요소따라가기', () => {
  it('이 탭의 지금 Locator 자리를 0.25초마다 비율로 쓰고, 다른 탭 요소 · page 에서 바로 부른 조작이면 지운다', async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'kit-box-'));
    const 장면 = join(폴더, 'b.jpg');
    const 쓰개 = 상자쓰개(장면);
    const page = { isClosed: () => false } as unknown as Page;
    const 요소 = (그탭: unknown) => ({ page: () => 그탭, first: () => ({ boundingBox: async () => ({ x: 640, y: 180, width: 320, height: 36 }) }) });

    다룬다(요소(page));
    const 멈추기 = 웹요소따라가기(page, () => ({ width: 1280, height: 720 }), 쓰개);
    await vi.waitFor(() => expect(readFileSync(`${장면}.box`, 'utf8')).toBe('0.5000,0.2500,0.2500,0.0500'));

    다룬다(요소({ 다른탭: true }));
    await vi.waitFor(() => expect(existsSync(`${장면}.box`)).toBe(false));
    다룬다(요소(page));
    await vi.waitFor(() => expect(existsSync(`${장면}.box`)).toBe(true));
    다룬다(undefined);
    await vi.waitFor(() => expect(existsSync(`${장면}.box`)).toBe(false));

    await 멈추기();
    await 쓰개.닫기();
  });
});
