import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => vi.fn());
vi.mock('webdriverio', () => ({ remote }));

import { appCapabilities, captureApp, openApp, type AppDriver } from './app.js';

describe('appCapabilities', () => {
  it('UDID 가 없으면 appium:udid 를 넣지 않는다', () => {
    expect(appCapabilities({ PLATFORM_APP: '/tmp/a.apk' })).toEqual({
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app': '/tmp/a.apk',
    });
  });

  it('UDID 가 있으면 appium:udid 를 넣는다', () => {
    const caps = appCapabilities({ PLATFORM_APP: '/tmp/a.apk', PLATFORM_DEVICE_UDID: 'R58M' });
    expect(caps['appium:udid']).toBe('R58M');
  });

  it('PLATFORM_APP 이 없으면 던진다', () => {
    expect(() => appCapabilities({})).toThrow('Android 앱 케이스를 돌리려면 PLATFORM_APP 이 필요하다');
  });
});

describe('openApp', () => {
  beforeEach(() => {
    remote.mockReset();
    remote.mockResolvedValue({ fake: true });
  });

  it('PLATFORM_APPIUM_URL 이 없으면 연결을 열기 전에 던진다', async () => {
    await expect(openApp({ PLATFORM_APP: '/tmp/a.apk' })).rejects.toThrow(
      'Android 앱 케이스를 돌리려면 PLATFORM_APPIUM_URL 이 필요하다',
    );
    expect(remote).not.toHaveBeenCalled();
  });

  it('PLATFORM_APP 이 없어도 연결을 열기 전에 던진다', async () => {
    await expect(openApp({ PLATFORM_APPIUM_URL: 'http://127.0.0.1:4723' })).rejects.toThrow(
      'Android 앱 케이스를 돌리려면 PLATFORM_APP 이 필요하다',
    );
    expect(remote).not.toHaveBeenCalled();
  });

  it('URL 을 protocol · hostname · port · path 로 풀어 remote 를 부른다', async () => {
    const driver = await openApp({
      PLATFORM_APPIUM_URL: 'http://127.0.0.1:4723',
      PLATFORM_APP: '/tmp/a.apk',
    });
    expect(driver).toEqual({ fake: true });
    expect(remote).toHaveBeenCalledWith({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',
      capabilities: appCapabilities({ PLATFORM_APP: '/tmp/a.apk' }),
    });
  });

  it('URL 안 계정을 user · key 로 넘긴다', async () => {
    await openApp({
      PLATFORM_APPIUM_URL: 'https://alice:s3cret@farm.example.com:8443/wd/hub',
      PLATFORM_APP: '/tmp/a.apk',
    });
    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'https',
        hostname: 'farm.example.com',
        port: 8443,
        path: '/wd/hub',
        user: 'alice',
        key: 's3cret',
      }),
    );
  });

  it('포트가 없으면 protocol 기본 포트를 쓴다', async () => {
    await openApp({ PLATFORM_APPIUM_URL: 'https://farm.example.com/wd/hub', PLATFORM_APP: '/a.apk' });
    await openApp({ PLATFORM_APPIUM_URL: 'http://farm.example.com', PLATFORM_APP: '/a.apk' });
    expect(remote.mock.calls[0]?.[0]).toMatchObject({ port: 443 });
    expect(remote.mock.calls[1]?.[0]).toMatchObject({ port: 80 });
    expect(remote.mock.calls[0]?.[0]).not.toHaveProperty('user');
  });
});

describe('captureApp', () => {
  let dir: string;
  const saved = { dir: process.env.PLATFORM_ARTIFACTS_DIR, run: process.env.PLATFORM_RUN_ID, hist: process.env.PLATFORM_HISTORY_ID };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'app-shot-'));
    process.env.PLATFORM_ARTIFACTS_DIR = dir;
    process.env.PLATFORM_RUN_ID = '7';
    process.env.PLATFORM_HISTORY_ID = '9';
  });

  afterEach(async () => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('PLATFORM_ARTIFACTS_DIR', saved.dir);
    restore('PLATFORM_RUN_ID', saved.run);
    restore('PLATFORM_HISTORY_ID', saved.hist);
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('shotPath 경로로 저장하고 recorded 경로를 돌려준다', async () => {
    const saveScreenshot = vi.fn().mockResolvedValue(Buffer.alloc(0));
    const recorded = await captureApp({ saveScreenshot } as unknown as AppDriver, 3);
    expect(recorded).toBe('artifacts/runs/7/9/3.png');
    expect(saveScreenshot).toHaveBeenCalledWith(join(dir, 'runs/7/9/3.png'));
  });

  it('저장이 실패하면 이유를 알리고 undefined 를 돌려준다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const saveScreenshot = vi.fn().mockRejectedValue(new Error('세션 끊김'));
    const recorded = await captureApp({ saveScreenshot } as unknown as AppDriver, 2);
    expect(recorded).toBeUndefined();
    expect(error).toHaveBeenCalledWith('[kit] 2번 절차 스크린샷 실패: 세션 끊김');
  });
});
