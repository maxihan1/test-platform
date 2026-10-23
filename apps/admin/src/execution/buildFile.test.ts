// 빌드 파일의 순수한 판정 — 서명 주소의 기한 · 위조 거절과 APK 판별(AAB · zip 아닌 파일 거절)을 DB 없이 본다

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import JSZip from 'jszip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { APK인가, 서명맞나, 서명주소, 앱칸 } from './buildFile.js';

const 시 = 60 * 60 * 1000;

describe('서명 주소', () => {
  const 옛값 = { url: process.env.PLATFORM_PUBLIC_URL, secret: process.env.SESSION_SECRET };
  beforeAll(() => {
    process.env.PLATFORM_PUBLIC_URL = 'https://qahub.test/';
    process.env.SESSION_SECRET = 'build-file-검사용-세션-열쇠-32바이트를-넘긴다';
  });
  afterAll(() => {
    process.env.PLATFORM_PUBLIC_URL = 옛값.url;
    process.env.SESSION_SECRET = 옛값.secret;
  });

  const 꺼내기 = (주소: string) => {
    const u = new URL(주소);
    return { path: u.pathname, exp: u.searchParams.get('exp') ?? undefined, sig: u.searchParams.get('sig') ?? undefined };
  };

  it('바깥 주소 위에 빌드 번호 · 기한 · 서명을 단다. 남은 기한은 1~2시간이다', () => {
    const 지금 = Date.UTC(2026, 9, 24, 3, 10);
    const { path, exp, sig } = 꺼내기(서명주소(42, 지금)!);
    expect(path).toBe('/api/builds/42/apk');
    expect(Number(exp) * 1000 - 지금).toBeGreaterThan(시);
    expect(Number(exp) * 1000 - 지금).toBeLessThanOrEqual(2 * 시);
    expect(서명맞나(42, exp, sig, 지금)).toBe(true);
  });

  it('같은 시간대에 만든 주소는 같다 — Appium 이 받아 둔 APK 를 다시 쓴다', () => {
    expect(서명주소(7, Date.UTC(2026, 9, 24, 3, 1))).toBe(서명주소(7, Date.UTC(2026, 9, 24, 3, 59)));
    expect(서명주소(7, Date.UTC(2026, 9, 24, 3, 59))).not.toBe(서명주소(7, Date.UTC(2026, 9, 24, 4, 0)));
  });

  it('기한이 지났거나 다른 빌드 번호 · 바꾼 기한 · 빈 서명이면 거절한다', () => {
    const 지금 = Date.UTC(2026, 9, 24, 3, 10);
    const { exp, sig } = 꺼내기(서명주소(42, 지금)!);
    expect(서명맞나(42, exp, sig, Number(exp) * 1000)).toBe(false);
    expect(서명맞나(43, exp, sig, 지금)).toBe(false);
    expect(서명맞나(42, String(Number(exp) + 3600), sig, 지금)).toBe(false);
    expect(서명맞나(42, exp, undefined, 지금)).toBe(false);
    expect(서명맞나(42, '1e12', sig, 지금)).toBe(false);
  });

  it('바깥 주소가 비면 주소를 만들지 않는다', () => {
    process.env.PLATFORM_PUBLIC_URL = '';
    expect(서명주소(42)).toBeNull();
    process.env.PLATFORM_PUBLIC_URL = 'https://qahub.test/';
  });
});

describe('android 항목이 깔 앱', () => {
  it('회사 저장소 주소 > 올린 APK 번호 > 그 줄의 앱 파일 경로', () => {
    expect(앱칸({ id: 1, buildNo: '1', hasFile: false, appUrl: 'https://s3.test/a.apk' }, '/apk/qa.apk')).toEqual({ app: 'https://s3.test/a.apk' });
    expect(앱칸({ id: 2, buildNo: '2', hasFile: true, appUrl: null }, '/apk/qa.apk')).toEqual({ buildId: 2 });
    expect(앱칸({ id: 3, buildNo: '3', hasFile: false, appUrl: null }, '/apk/qa.apk')).toEqual({ app: '/apk/qa.apk' });
    expect(앱칸(null, null)).toEqual({});
  });
});

describe('APK 판별', () => {
  let 폴더: string;
  beforeAll(async () => {
    폴더 = await mkdtemp(join(tmpdir(), 'xbd-apk-'));
  });
  afterAll(async () => {
    await rm(폴더, { recursive: true, force: true });
  });

  async function zip(이름: string, 파일들: string[]): Promise<string> {
    const z = new JSZip();
    for (const f of 파일들) z.file(f, 'x');
    const 자리 = join(폴더, 이름);
    await writeFile(자리, await z.generateAsync({ type: 'nodebuffer' }));
    return 자리;
  }

  it('맨 위에 AndroidManifest.xml 이 있으면 APK 다', async () => {
    expect(await APK인가(await zip('a.apk', ['classes.dex', 'AndroidManifest.xml', 'res/x.png']))).toBe(true);
  });

  it('AAB(base/manifest/ 아래) · 매니페스트 없는 zip · zip 이 아닌 파일은 APK 가 아니다', async () => {
    expect(await APK인가(await zip('b.aab', ['BundleConfig.pb', 'base/manifest/AndroidManifest.xml']))).toBe(false);
    expect(await APK인가(await zip('c.zip', ['readme.txt']))).toBe(false);
    const 글 = join(폴더, 'd.apk');
    await writeFile(글, 'PK 처럼 보이지만 zip 이 아니다');
    expect(await APK인가(글)).toBe(false);
  });
});
