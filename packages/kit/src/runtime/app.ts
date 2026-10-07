// Android 앱 케이스가 Appium 에 연결하고 스크린샷을 찍는 부품. 연결 설정은 러너 환경값에서 읽는다

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser } from 'webdriverio';

import { runDir, saveShot } from './artifacts.js';
import { APPIUM_SESSION_FILE } from './protocol.js';

export type AppDriver = Browser;

type Env = Record<string, string | undefined>;

const DEFAULT_PORTS: Record<string, number> = { 'http:': 80, 'https:': 443 };

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Android 앱 케이스를 돌리려면 ${name} 이 필요하다`);
  return value;
}

export function appCapabilities(env: Env): Record<string, string> {
  const caps: Record<string, string> = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': required(env, 'PLATFORM_APP'),
  };
  // UDID 가 없으면 Appium 이 연결된 한 대를 고른다
  if (env.PLATFORM_DEVICE_UDID) caps['appium:udid'] = env.PLATFORM_DEVICE_UDID;
  return caps;
}

export async function openApp(env: Env): Promise<AppDriver> {
  // 연결을 열기 전에 두 값을 다 확인해야 반쯤 열린 세션이 남지 않는다
  const url = new URL(required(env, 'PLATFORM_APPIUM_URL'));
  const capabilities = appCapabilities(env);
  // 브라우저 케이스가 쓰지도 않는 부품을 싣지 않으려고 쓸 때 불러온다
  const { remote } = await import('webdriverio');
  // 디바이스 팜이 https · 인증을 써도 같은 값으로 붙게 URL 의 조각을 전부 넘긴다
  const driver = await remote({
    protocol: url.protocol.replace(':', ''),
    hostname: url.hostname,
    port: url.port ? Number(url.port) : DEFAULT_PORTS[url.protocol],
    path: url.pathname,
    // 기본 수준(info)은 명령마다 stdout 에 찍어 러너가 실패 사유로 보는 꼬리를 채운다
    logLevel: 'warn',
    ...(url.username && {
      user: decodeURIComponent(url.username),
      key: decodeURIComponent(url.password),
    }),
    capabilities,
  });
  await writeSessionFile(driver.sessionId);
  return driver;
}

function sessionFile(): string {
  return join(runDir(process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0'), APPIUM_SESSION_FILE);
}

// 러너가 케이스 프로세스를 죽여도 남은 연결을 닫을 수 있게 번호를 적어 둔다
async function writeSessionFile(sessionId: string): Promise<void> {
  try {
    const file = sessionFile();
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, `${sessionId}\n`);
  } catch (err) {
    // 던지면 이미 열린 연결을 아무도 못 닫는다. 케이스는 그대로 돌고, 번호를 못 적었다는 것만 알린다
    console.error(`[kit] Appium 연결 번호를 적지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 닫기가 실패하면 파일을 남겨 러너가 다시 닫을 수 있게 한다
export async function closeApp(driver: AppDriver): Promise<void> {
  await driver.deleteSession();
  await rm(sessionFile(), { force: true });
}

export function captureApp(driver: AppDriver, seq: number): Promise<string | undefined> {
  return saveShot(seq, (path) => driver.saveScreenshot(path));
}
