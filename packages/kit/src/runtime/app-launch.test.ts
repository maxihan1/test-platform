// 앱 켜기: Appium 은 깔기만 하고 kit 이 켜는 길 — 권한 창 · 남기는 연결 · 안 뜬 앱 · 켜기 실패 때 연결 닫기를 본다

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => vi.fn());
vi.mock('webdriverio', () => ({ remote }));

import { appCapabilities, openApp, 연결꾸러미, 앱을켠다, 켜기전에 } from './app.js';

/** 앞에 뜬 꾸러미를 차례로 답하는 Appium execute — 마지막 것은 계속 답한다 */
function 실행(앞: string[]) {
  const 부름: [string, Record<string, unknown>][] = [];
  const f = vi.fn(async (script: string, args: Record<string, unknown> = {}) => {
    부름.push([script, args]);
    return script === 'mobile: getCurrentPackage' ? (앞.length > 1 ? 앞.shift() : 앞[0]) : true;
  });
  return { f, 부름 };
}

const 빨리 = { 기다림_ms: 5_000, 간격_ms: 1 };

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
    expect(await 앱을켠다(f, 'org.joinmastodon.android', '지운다', 빨리)).toBeNull();
    expect(부름.map(([s]) => s)).toEqual(['mobile: clearApp', 'mobile: activateApp', 'mobile: getCurrentPackage', 'mobile: getCurrentPackage']);
    expect(부름[1]?.[1]).toEqual({ appId: 'org.joinmastodon.android' });
  });

  it('데이터를 지우는 연결은 켜기 전에 앱 데이터를 한 번 더 지운다 — 설치 순간 Android 가 백업에서 옛 로그인을 되살린다 (2026-11-16 정식 실행 21136)', async () => {
    const { f, 부름 } = 실행(['com.shop']);
    await 앱을켠다(f, 'com.shop', '지운다', 빨리);
    expect(부름.slice(0, 2)).toEqual([
      ['mobile: clearApp', { appId: 'com.shop' }],
      ['mobile: activateApp', { appId: 'com.shop' }],
    ]);
    expect(부름.map(([s]) => s)).not.toContain('mobile: terminateApp');
  });

  it('데이터를 남기는 연결은 앱을 끄고 다시 켠다 — 앞 케이스의 앱을 앞으로 가져오기만 하지 않게', async () => {
    const { f, 부름 } = 실행(['com.shop']);
    expect(await 앱을켠다(f, 'com.shop', '끈다', 빨리)).toBeNull();
    expect(부름.slice(0, 2)).toEqual([
      ['mobile: terminateApp', { appId: 'com.shop' }],
      ['mobile: activateApp', { appId: 'com.shop' }],
    ]);
    expect(부름.map(([s]) => s)).not.toContain('mobile: clearApp');
  });

  it('지우기가 실패해도 켠다 — 지우기는 폰 설정을 덮는 안전망이라 케이스 전부를 막지 않는다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { f, 부름 } = 실행(['com.shop']);
    f.mockImplementationOnce(async () => {
      throw new Error('pm clear 거절');
    });
    expect(await 앱을켠다(f, 'com.shop', '지운다', 빨리)).toBeNull();
    expect(부름.map(([s]) => s)).toContain('mobile: activateApp');
    expect(error).toHaveBeenCalledWith('[kit] 앱 데이터를 지우지 못하고 켠다: pm clear 거절');
  });

  it('시간 안에 앞에 안 오면 던지지 않고 마지막에 본 앞 화면을 돌려준다', async () => {
    const { f } = 실행(['com.sec.android.app.launcher']);
    expect(await 앱을켠다(f, 'com.shop', null, { 기다림_ms: 20, 간격_ms: 1 })).toBe('com.sec.android.app.launcher');
  });
});

describe('앱을켠다 — 값을 실어 켜기', () => {
  const 값 = { activity: '.QaLoginActivity', extras: { server: 'mastodon.example', token: 't-1' } };

  it('값이 있으면 지운 뒤 그 화면을 글자 값과 함께 켠다 — 로그인된 채로 시작한다', async () => {
    const { f, 부름 } = 실행(['com.shop']);
    expect(await 앱을켠다(f, 'com.shop', '지운다', { ...빨리, 값 })).toBeNull();
    expect(부름.slice(0, 2)).toEqual([
      ['mobile: clearApp', { appId: 'com.shop' }],
      ['mobile: startActivity', { component: 'com.shop/.QaLoginActivity', extras: [['s', 'server', 'mastodon.example'], ['s', 'token', 't-1']] }],
    ]);
    expect(부름.map(([s]) => s)).not.toContain('mobile: activateApp');
  });

  it('실어 켜기가 실패하면 알리고 그냥 켠다 — 입구가 없는 옛 APK 도 지금처럼 돈다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const 답 of [
      async () => 'Starting: Intent { cmp=com.shop/.QaLoginActivity }\nError type 3\nError: Activity class {com.shop/.QaLoginActivity} does not exist.\n',
      async () => "Exception occurred while executing 'start':\njava.lang.SecurityException: Permission Denial: not exported\n",
      async () => {
        throw new Error("Command 'am start -n com.shop/.QaLoginActivity --es server mastodon.example --es token t-1' exited with code 1");
      },
    ]) {
      const 부름: string[] = [];
      const f = async (script: string) => {
        부름.push(script);
        if (script === 'mobile: startActivity') return 답();
        return script === 'mobile: getCurrentPackage' ? 'com.shop' : true;
      };
      expect(await 앱을켠다(f, 'com.shop', '지운다', { ...빨리, 값 })).toBeNull();
      expect(부름.slice(0, 3)).toEqual(['mobile: clearApp', 'mobile: startActivity', 'mobile: activateApp']);
    }
    expect(error).toHaveBeenCalledTimes(3);
    expect(String(error.mock.calls[0]?.[0])).toContain('[kit] 값을 실어 켜지 못해 그냥 켠다(.QaLoginActivity): Error type 3');
    expect(String(error.mock.calls[1]?.[0])).toContain('Exception occurred');
    expect(String(error.mock.calls.flat())).not.toContain('t-1');
  });
});

describe('켜기전에', () => {
  it('남기는 연결은 끄고 · APK 를 깐 연결은 지우고 · 스토어 앱과 게임 화면 읽기는 아무것도 안 한다', () => {
    expect(켜기전에(appCapabilities({ PLATFORM_APP: '/tmp/a.apk' }, { keepData: true }), false)).toBe('끈다');
    expect(켜기전에(appCapabilities({ PLATFORM_APP: '/tmp/g.apk', PLATFORM_ENGINE: 'GAME' }), true)).toBe('끈다');
    expect(켜기전에(appCapabilities({ PLATFORM_APP: '/tmp/a.apk' }), false)).toBe('지운다');
    expect(켜기전에(appCapabilities({ PLATFORM_APP: 'com.shop.app' }), false)).toBeNull();
    expect(켜기전에({ ...appCapabilities({ PLATFORM_APP: '/tmp/g.apk', PLATFORM_ENGINE: 'GAME' }), 'appium:noReset': false }, true)).toBeNull();
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
    overwriteCommand: vi.fn(),
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
    expect(앱.execute.mock.calls.map(([s]) => s).filter((s) => s !== 'mobile: shell').slice(0, 2)).toEqual(['mobile: clearApp', 'mobile: activateApp']);
    expect(앱.execute).not.toHaveBeenCalledWith('mobile: terminateApp', expect.anything());
    const 남김 = 연결();
    remote.mockResolvedValue(남김);
    await openApp(ENV, { keepData: true });
    expect(남김.execute).toHaveBeenCalledWith('mobile: terminateApp', { appId: 'com.shop' });
  });

  it('케이스가 고른 값을 실어 켠다', async () => {
    const 앱 = 연결();
    remote.mockResolvedValue(앱);
    await openApp(ENV, { intent: { activity: '.QaLoginActivity', extras: { token: 't-1' } } });
    expect(앱.execute).toHaveBeenCalledWith('mobile: startActivity', { component: 'com.shop/.QaLoginActivity', extras: [['s', 'token', 't-1']] });
    expect(앱.execute).not.toHaveBeenCalledWith('mobile: activateApp', expect.anything());
  });

  it('앱을 못 켜면 연 연결을 닫고 던진다 — 팜 폰이 붙들리지 않게', async () => {
    const 앱 = 연결();
    앱.execute.mockRejectedValue(new Error('앱이 없다'));
    remote.mockResolvedValue(앱);
    await expect(openApp(ENV)).rejects.toThrow('앱을 켜지 못했다: 앱이 없다');
    expect(앱.deleteSession).toHaveBeenCalledTimes(1);
  });

  it('폰에 판 번호가 같은 옛 앱이 남아 있으면 지우고 넘긴 APK 를 깐 뒤 켠다 — Appium 은 판이 같으면 안 깐다 (2026-11-21 BRM 정식 실행 21177)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 부름: string[] = [];
    const execute = vi.fn(async (script: string, args: Record<string, unknown> = {}) => {
      부름.push(script);
      if (script === 'mobile: getCurrentPackage') return 'com.shop';
      if (script !== 'mobile: shell') return true;
      if (args.command === 'dumpsys') return '    versionCode=1 minSdk=24\n    lastUpdateTime=2026-11-01 10:00:00\n';
      if (args.command === 'date') return '2026-11-21T15:00:00\n';
      return '';
    });
    remote.mockResolvedValue({ ...연결(), execute });
    await openApp({ ...ENV, PLATFORM_ENGINE: 'GAME' });
    expect(execute).toHaveBeenCalledWith('mobile: removeApp', { appId: 'com.shop' });
    expect(execute).toHaveBeenCalledWith('mobile: installApp', { appPath: '/tmp/a.apk' });
    expect(부름.indexOf('mobile: installApp')).toBeLessThan(부름.indexOf('mobile: activateApp'));
  });

  it('APK 인데 연결 응답에 꾸러미 이름이 없으면 연결을 닫고 던진다', async () => {
    const 앱 = 연결(['com.shop'], {});
    remote.mockResolvedValue(앱);
    await expect(openApp(ENV)).rejects.toThrow('Appium 이 앱 꾸러미 이름을 주지 않아');
    expect(앱.deleteSession).toHaveBeenCalledTimes(1);
  });
});
