// 테스트 모드 장면 — 마지막 장면만 덮어 쓰는지, 실제 Chromium 탭에서 JPEG 장면이 쌓이고 끄면 지워지는지 본다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 장면걸기, 장면쓰개 } from './live.js';

let 폴더 = '';

beforeAll(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'kit-live-'));
});

afterAll(() => {
  rmSync(폴더, { recursive: true, force: true });
});

describe('장면쓰개', () => {
  it('쓰는 동안 쏟아진 장면은 마지막 것만 쓴다 — 마지막 장면을 빠뜨리지 않고 임시 파일도 안 남긴다', async () => {
    const 파일 = join(폴더, '쓰개.jpg');
    const 쓰개 = 장면쓰개(파일, 20);

    for (let i = 1; i <= 30; i++) 쓰개.받기(Buffer.from(`장면 ${i}`));

    await vi.waitFor(() => expect(readFileSync(파일, 'utf8')).toBe('장면 30'));
    expect(existsSync(`${파일}.tmp`)).toBe(false);
  });

  it('닫으면 파일을 지우고 그 뒤에 온 장면은 안 쓴다', async () => {
    const 파일 = join(폴더, '닫기.jpg');
    const 쓰개 = 장면쓰개(파일, 20);
    쓰개.받기(Buffer.from('첫 장면'));

    await 쓰개.닫기();
    쓰개.받기(Buffer.from('늦은 장면'));
    await new Promise((끝) => setTimeout(끝, 60));

    expect(existsSync(파일)).toBe(false);
  });
});

describe('장면걸기 (브라우저)', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  }, 30_000);

  afterAll(async () => {
    await browser.close();
  });

  it('장면 파일을 안 받은 실행(정식 실행)은 아무것도 안 건다', async () => {
    const page = await browser.newPage();
    try {
      expect(await 장면걸기(page, '')).toBeUndefined();
    } finally {
      await page.close();
    }
  });

  it('테스트 모드는 탭의 장면을 JPEG 로 쓰고, 끄면 파일을 지운다', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000003.jpg');
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    try {
      const 장면 = await 장면걸기(page, 파일);
      await page.setContent('<button type="button" style="margin:80px">로그인</button>');
      await page.click('button');

      await vi.waitFor(() => expect(readFileSync(파일).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])), { timeout: 5000 });
      await 장면?.끄기();
      expect(existsSync(파일)).toBe(false);
    } finally {
      await page.close();
    }
  });

  it('탭이 먼저 닫혀도 끄기가 던지지 않고 파일을 지운다', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000004.jpg');
    const page = await browser.newPage();
    const 장면 = await 장면걸기(page, 파일);
    await page.setContent('<p>장면</p>');
    await vi.waitFor(() => expect(existsSync(파일)).toBe(true), { timeout: 5000 });
    await page.close();

    await 장면?.끄기();

    expect(existsSync(파일)).toBe(false);
  });
});
