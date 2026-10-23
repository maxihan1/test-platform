// 앱 연결이 연 폰 · 앱 판을 읽고, 못 읽은 칸은 비우는지 본다 (도메인/러너 §5.2 · APP-F1-05)

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('webdriverio', () => ({ remote: vi.fn() }));

import { readDevice, type AppDriver } from './app.js';

function 폰(덮을것: { capabilities?: Record<string, unknown>; execute?: () => Promise<unknown> } = {}): AppDriver {
  return {
    capabilities: { deviceModel: 'SM-G996N', platformVersion: '14', appPackage: 'com.example.shop', ...덮을것.capabilities },
    execute: vi.fn(덮을것.execute ?? (async () => '    versionCode=42 minSdk=24\n    versionName=1.4.2\n')),
  } as unknown as AppDriver;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readDevice', () => {
  it('모델 · Android 판은 연결 응답에서, 앱 판 · 빌드 코드는 dumpsys 의 versionName · versionCode 에서 읽는다', async () => {
    const driver = 폰();
    expect(await readDevice(driver)).toEqual({ model: 'SM-G996N', osVersion: '14', appVersion: '1.4.2', appBuild: '42' });
    expect(driver.execute).toHaveBeenCalledWith('mobile: shell', { command: 'dumpsys', args: ['package', 'com.example.shop'] });
  });

  it('연결 응답에 앱 이름이 없으면 묻지 않고 앱 판을 비운다 — 앞에 뜬 남의 앱 판을 적지 않는다', async () => {
    const driver = 폰({ capabilities: { appPackage: undefined } });
    expect(await readDevice(driver)).toMatchObject({ appVersion: null, appBuild: null });
    expect(driver.execute).not.toHaveBeenCalled();
  });

  it('appium: 이 붙은 이름도 읽는다', async () => {
    const driver = 폰({ capabilities: { deviceModel: undefined, platformVersion: undefined, 'appium:deviceModel': 'SM-S918N', 'appium:platformVersion': '15' } });
    expect(await readDevice(driver)).toMatchObject({ model: 'SM-S918N', osVersion: '15' });
  });

  it('Appium 이 shell 을 막으면 앱 판만 비우고 까닭을 stderr 에 남긴다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const driver = 폰({ execute: async () => Promise.reject(new Error('adb_shell 을 허용하지 않았다')) });
    expect(await readDevice(driver)).toEqual({ model: 'SM-G996N', osVersion: '14', appVersion: null, appBuild: null });
    expect(String(오류.mock.calls[0]?.[0])).toContain('--allow-insecure=uiautomator2:adb_shell');
  });

  it('연결 응답에 없는 칸은 null 이다 — 지어내지 않는다', async () => {
    expect(await readDevice(폰({ capabilities: { deviceModel: '', platformVersion: undefined } }))).toMatchObject({ model: null, osVersion: null });
  });
});
