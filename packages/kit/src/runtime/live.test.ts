// 테스트 모드 장면 — 마지막 장면만 덮어 쓰는지, 실제 Chromium 탭에서 JPEG 장면이 쌓이고 끄면 지워지는지 본다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 장면걸기, 장면쓰개, 폰장면걸기 } from './live.js';

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

describe('폰장면걸기', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

  it('장면 파일을 안 받은 실행(정식 실행)은 폰을 안 찍는다', async () => {
    const takeScreenshot = vi.fn(async () => PNG.toString('base64'));

    expect(await 폰장면걸기({ takeScreenshot }, '')).toBeUndefined();
    expect(takeScreenshot).not.toHaveBeenCalled();
  });

  it('테스트 모드는 Appium 폰 화면을 PNG 그대로 쓰고 쉬었다 다시 찍는다 — 끄면 더 안 찍고 파일을 지운다', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000004.jpg');
    const takeScreenshot = vi.fn(async () => PNG.toString('base64'));

    const 장면 = await 폰장면걸기({ takeScreenshot }, 파일, 10);
    await vi.waitFor(() => expect(takeScreenshot.mock.calls.length).toBeGreaterThanOrEqual(2));
    await vi.waitFor(() => expect(readFileSync(파일)).toEqual(PNG));
    await 장면?.끄기();
    const 찍은수 = takeScreenshot.mock.calls.length;
    await new Promise((끝) => setTimeout(끝, 40));

    expect(takeScreenshot.mock.calls.length).toBe(찍은수);
    expect(existsSync(파일)).toBe(false);
  });

  it('찍기가 매달려도 끄기는 2초 안에 끝나고 파일을 지운다 — 단계 한도 실패를 더 늦추지 않는다', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000006.jpg');
    const takeScreenshot = vi.fn<() => Promise<string>>().mockResolvedValueOnce(PNG.toString('base64')).mockReturnValue(new Promise<string>(() => {}));

    const 장면 = await 폰장면걸기({ takeScreenshot }, 파일, 10);
    await vi.waitFor(() => expect(takeScreenshot).toHaveBeenCalledTimes(2));
    const 시작 = Date.now();
    await 장면?.끄기();

    expect(Date.now() - 시작).toBeLessThan(3_000);
    expect(existsSync(파일)).toBe(false);
  });

  it('한 장을 못 찍어도 멈추지 않고 다음 장을 찍는다', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000005.jpg');
    const takeScreenshot = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('앱이 넘어가는 중')).mockResolvedValue(PNG.toString('base64'));
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const 장면 = await 폰장면걸기({ takeScreenshot }, 파일, 10);
      await vi.waitFor(() => expect(readFileSync(파일)).toEqual(PNG));
      await 장면?.끄기();

      expect(경고).toHaveBeenCalledTimes(1);
    } finally {
      경고.mockRestore();
    }
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

  it('영상 경로도 오면 한 호출로 영상과 장면을 같이 받는다 — 실제 폰 Chrome 정식 실행', async () => {
    const 파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000005.jpg');
    const 영상 = join(폴더, 'farm', 'video.webm');
    const page = await browser.newPage();
    try {
      const 장면 = await 장면걸기(page, 파일, 영상);
      await page.setContent('<p>영상과 장면</p>');

      await vi.waitFor(() => expect(existsSync(파일)).toBe(true), { timeout: 5000 });
      await 장면?.끄기();
      expect(statSync(영상).size).toBeGreaterThan(0);
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
