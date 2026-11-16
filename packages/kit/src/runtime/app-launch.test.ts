// 앱 켜기: Appium 은 깔기만 하고 kit 이 켜는 길 — 권한 창 · 남기는 연결 · 안 뜬 앱 · 켜기 실패 때 연결 닫기를 본다

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => vi.fn());
vi.mock('webdriverio', () => ({ remote }));

import { appCapabilities, openApp, 연결꾸러미, 앱을켠다 } from './app.js';

/** 앞에 뜬 꾸러미를 차례로 답하는 Appium execute — 마지막 것은 계속 답한다 */
function 실행(앞: string[]) {
  const 부름: [string, Record<string, unknown>][] = [];
  const f = vi.fn(async (script: string, args: Record<string, unknown> = {}) => {
    부름.push([script, args]);
    return script === 'mobile: getCurrentPackage' ? (앞.length > 1 ? 앞.shift() : 앞[0]) : true;
  });
  return { f, 부름 };
}

describe('appCapabilities 켜기', () => {
  it('Appium 은 앱을 깔기만 하고 켜지 않는다 — 켜면 첫 화면을 기다리다 권한 창에 막혀 연결째 실패한다', () => {
    for (const caps of [
      appCapabilities({ PLATFORM_APP: '/tmp/a.apk' }),
      appCapabilities({ PLATFORM_APP: 'com.shop.app' }, { keepData: true }),
      appCapabilities({ PLATFORM_APP: '/tmp/g.apk', PLATFORM_ENGINE: 'GAME' }),
    ]) {
      expect(caps['appium:autoLaunch']).toBe(false);
      expect('appium:forceAppLaunch' in caps).toBe(false);
    }
  });
});

describe('앱을켠다', () => {
  it('켜자마자 권한 창이 앞에 떠도 켜진 것으로 본다 — 권한 창은 케이스가 답한다', async () => {
    const { f, 부름 } = 실행(['com.sec.android.app.launcher', 'com.google.android.permissioncontroller']);
    expect(await 앱을켠다(f, 'org.joinmastodon.android', false, 5_000, 1)).toBeNull();
    expect(부름.map(([s]) => s)).toEqual(['mobile: clearApp', 'mobile: activateApp', 'mobile: getCurrentPackage', 'mobile: getCurrentPackage']);
    expect(부름[1]?.[1]).toEqual({ appId: 'org.joinmastodon.android' });
  });

  it('데이터를 지우는 연결은 켜기 전에 앱 데이터를 한 번 더 지운다 — 설치 순간 Android 가 백업에서 옛 로그인을 되살린다 (2026-11-16 정식 실행 21136)', async () => {
    const { f, 부름 } = 실행(['com.shop']);
    await 앱을켠다(f, 'com.shop', false, 5_000, 1);
    expect(부름.slice(0, 2)).toEqual([
      ['mobile: clearApp', { appId: 'com.shop' }],
      ['mobile: activateApp', { appId: 'com.shop' }],
    ]);
    expect(부름.map(([s]) => s)).not.toContain('mobile: terminateApp');
  });

  it('데이터를 남기는 연결은 앱을 끄고 다시 켠다 — 앞 케이스의 앱을 앞으로 가져오기만 하지 않게', async () => {
    const { f, 부름 } = 실행(['com.shop']);
    expect(await 앱을켠다(f, 'com.shop', true, 5_000, 1)).toBeNull();
    expect(부름.slice(0, 2)).toEqual([
      ['mobile: terminateApp', { appId: 'com.shop' }],
      ['mobile: activateApp', { appId: 'com.shop' }],
    ]);
    expect(부름.map(([s]) => s)).not.toContain('mobile: clearApp');
  });

  it('시간 안에 앞에 안 오면 던지지 않고 마지막에 본 앞 화면을 돌려준다', async () => {
    const { f } = 실행(['com.sec.android.app.launcher']);
    expect(await 앱을켠다(f, 'com.shop', false, 20, 1)).toBe('com.sec.android.app.launcher');
  });
});

describe('연결꾸러미', () => {
  it('연결 응답의 꾸러미 이름을 쓴다 — appium: 이 붙어 와도 읽는다', () => {
    expect(연결꾸러미({ appPackage: 'com.a' }, '/a.apk')).toBe('com.a');
    expect(연결꾸러미({ 'appium:appPackage': 'com.b' }, '/a.apk')).toBe('com.b');
  });

  it('응답에 없으면 스토어 앱 패키지 이름만 대신 쓰고, APK 면 던진다', () => {
    expect(연결꾸러미({}, 'com.shop.app')).toBe('com.shop.app');
    expect(() => 연결꾸러미({}, 'https://builds/a.apk')).toThrow('Appium 이 앱 꾸러미 이름을 주지 않아');
  });
});

describe('openApp 켜기', () => {
  const ENV = { PLATFORM_APPIUM_URL: 'http://127.0.0.1:4723', PLATFORM_APP: '/tmp/a.apk' };
  const saved = process.env.PLATFORM_ARTIFACTS_DIR;
  let dir: string;
  const 연결 = (앞 = ['com.shop'], caps: Record<string, unknown> = { appPackage: 'com.shop' }) => ({
    sessionId: 'sess-1',
    capabilities: caps,
    execute: 실행(앞).f,
    deleteSession: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    remote.mockReset();
    dir = await mkdtemp(join(tmpdir(), 'app-launch-'));
    process.env.PLATFORM_ARTIFACTS_DIR = dir;
  });

  afterEach(async () => {
    if (saved === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = saved;
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('연결 응답의 꾸러미 이름으로 kit 이 켠다 — 남기는 연결이면 먼저 끈다', async () => {
    const 앱 = 연결();
    remote.mockResolvedValue(앱);
    await openApp(ENV);
    expect(앱.execute).toHaveBeenCalledWith('mobile: activateApp', { appId: 'com.shop' });
    expect(앱.execute).toHaveBeenCalledWith('mobile: clearApp', { appId: 'com.shop' });
    expect(앱.execute).not.toHaveBeenCalledWith('mobile: terminateApp', expect.anything());
    const 남김 = 연결();
    remote.mockResolvedValue(남김);
    await openApp(ENV, { keepData: true });
    expect(남김.execute).toHaveBeenCalledWith('mobile: terminateApp', { appId: 'com.shop' });
  });

  it('앱을 못 켜면 연 연결을 닫고 던진다 — 팜 폰이 붙들리지 않게', async () => {
    const 앱 = 연결();
    앱.execute.mockRejectedValue(new Error('앱이 없다'));
    remote.mockResolvedValue(앱);
    await expect(openApp(ENV)).rejects.toThrow('앱을 켜지 못했다: 앱이 없다');
    expect(앱.deleteSession).toHaveBeenCalledTimes(1);
  });

  it('APK 인데 연결 응답에 꾸러미 이름이 없으면 연결을 닫고 던진다', async () => {
    const 앱 = 연결(['com.shop'], {});
    remote.mockResolvedValue(앱);
    await expect(openApp(ENV)).rejects.toThrow('Appium 이 앱 꾸러미 이름을 주지 않아');
    expect(앱.deleteSession).toHaveBeenCalledTimes(1);
  });
});
