// Android 앱 케이스가 Appium 에 연결하고 스크린샷을 찍는 부품. 연결 설정은 러너 환경값에서 읽는다

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser } from 'webdriverio';

import type { DeviceInfo } from '../types.js';

import { runDir, saveShot } from './artifacts.js';
import { 앱사진 } from './highlight.js';
import { 키보드창기다리기 } from './keyboardWindow.js';
import { 화면켜기인자 } from './lifecycleParts.js';
import { APPIUM_SESSION_FILE, APPIUM_SESSION_ID_FILE, PHONE_STATE_FILE, 패키지이름인가 } from './protocol.js';
import { 웹뷰사진, 웹맥락인가, 웹요소인가 } from './webview.js';

export type AppDriver = Browser;

type Env = Record<string, string | undefined>;

const DEFAULT_PORTS: Record<string, number> = { 'http:': 80, 'https:': 443 };

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Android 앱 케이스를 돌리려면 ${name} 이 필요하다`);
  return value;
}

/** 켤 때 실을 값 — 앱의 화면 하나(꾸러미 안 이름, `.Qa` 처럼 점으로 시작해도 된다)와 글자 값들 (도메인/러너 §5.2 「값을 실어 켜기」) */
export interface AppLaunchIntent {
  activity: string;
  extras: Record<string, string>;
}

/** 케이스가 고르는 연결 설정 — 「데이터 남기고 시작」 · 「값을 실어 켜기」 (도메인/러너 §5.2) */
export interface AppOpenOptions {
  keepData?: boolean;
  intent?: AppLaunchIntent;
}

export function appCapabilities(env: Env, options: AppOpenOptions = {}): Record<string, string | boolean | number> {
  const caps: Record<string, string | boolean | number> = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    // 꾸러미 이름 없는 resource-id 를 쓰는 앱도 id= 로 찾게 한다. 긴 꼴(com.shop:id/x)은 그대로 찾는다 (§5.2 「앱 실행」)
    'appium:disableIdLocatorAutocompletion': true,
    // 깔기만 시키고 켜기는 kit 이 한다(앱을켠다) — Appium 이 켜면 첫 화면이 20초 안에 앞에 와야 연결이 열리는데, 켜자마자 뜬 권한 창이 앞을 막으면 연결째 실패한다 (§5.2 「앱 실행」)
    'appium:autoLaunch': false,
  };
  const app = required(env, 'PLATFORM_APP');
  // 스토어로 깐 앱은 APK 가 없어 깔지 않고 켠다. noReset 을 안 줘 연결 때 앱 데이터를 지운다 — APK 를 새로 깔 때처럼 로그아웃 상태로 시작한다 (§5.2 「플레이스토어 앱 — 패키지 이름」)
  caps[패키지이름인가(app) ? 'appium:appPackage' : 'appium:app'] = app;
  // UDID 가 없으면 Appium 이 연결된 한 대를 고른다
  if (env.PLATFORM_DEVICE_UDID) caps['appium:udid'] = env.PLATFORM_DEVICE_UDID;
  // 데이터 남기기를 고른 앱 케이스 — 앞 케이스의 로그인을 이어 쓰고 앱만 다시 켠다(끄고 켜기는 앱을켠다). 폰을 놓으면 팜이 데이터를 지워, 한 번 잡고 이어 도는 작성 폰 돌려 보기에서만 이어진다 (도메인/러너 §5.2 「데이터 남기고 시작」)
  if (options.keepData === true) {
    Object.assign(caps, { 'appium:noReset': true, 'appium:shouldTerminateApp': true });
  }
  // 게임은 실행 하나 동안 폰을 쥐고 한 번만 깐다 — 항목마다 데이터는 두고 앱만 다시 켠다. 상태는 케이스가 어드민 API 로 맞춘다 (도메인/게임 §3.10 「게임 연결」).
  // 게임 명령은 Appium 을 거치지 않아, 기본 60초면 Appium 명령이 뜸한 긴 절차(확률 대량 시도) 도중 연결이 끊긴다
  if (env.PLATFORM_ENGINE === 'GAME') {
    Object.assign(caps, {
      'appium:noReset': true,
      'appium:shouldTerminateApp': true,
      'appium:newCommandTimeout': 300,
    });
  }
  // E2E 시나리오는 앱 단계 사이에 웹 단계가 몇 개 끼어도 연결이 안 끊기게 시나리오 제한 시간으로 연다 (도메인/시나리오 §3.7 결정 16)
  const 한도 = Number(env.PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT);
  if (한도 > 0) caps['appium:newCommandTimeout'] = 한도;
  // 호환성 실행 항목만 — 디바이스 팜 비전이 명령마다 화면을 찍어 연결이 닫힌 뒤 AI 로 점검한다 (도메인/호환성 §7 「러너 · kit」)
  if (env.PLATFORM_UI_CHECK === '1') caps['farm:uiCheck'] = true;
  return caps;
}

export async function openApp(env: Env, options: AppOpenOptions = {}): Promise<AppDriver> {
  // 연결을 열기 전에 두 값을 다 확인해야 반쯤 열린 세션이 남지 않는다
  const url = new URL(required(env, 'PLATFORM_APPIUM_URL'));
  const capabilities = appCapabilities(env, options);
  // 브라우저 케이스가 쓰지도 않는 부품을 싣지 않으려고 쓸 때 불러온다
  const { remote } = await import('webdriverio');
  const token = env.PLATFORM_APPIUM_TOKEN;
  // 디바이스 팜이 https · 인증을 써도 같은 값으로 붙게 URL 의 조각을 전부 넘긴다
  const driver = await remote({
    protocol: url.protocol.replace(':', ''),
    hostname: url.hostname,
    port: url.port ? Number(url.port) : DEFAULT_PORTS[url.protocol],
    path: url.pathname,
    // 기본 수준(info)은 명령마다 stdout 에 찍어 러너가 실패 사유로 보는 꼬리를 채운다
    logLevel: 'warn',
    // 인증 켠 팜은 모든 요청에 토큰을 받는다. user · key 는 연결 열기 요청에만 붙고 그 머리를 Basic 으로 덮어 같이 넘기지 않는다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)
    ...(token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : url.username && {
          user: decodeURIComponent(url.username),
          key: decodeURIComponent(url.password),
        }),
    capabilities,
  });
  await writeSessionFile(driver.sessionId);
  키보드창기다리기(driver);
  try {
    const 꾸러미 = 연결꾸러미(driver.capabilities, required(env, 'PLATFORM_APP'));
    const 앞 = await 앱을켠다((script, args) => driver.execute(script, args), 꾸러미, 켜기전에(capabilities, env.PLATFORM_ENGINE === 'GAME'), { 값: options.intent });
    // 케이스는 그대로 돈다 — 첫 단계가 실패하면 이 줄이 「앱이 안 떴다」를 알려 준다(런처 · 앱이 죽은 창)
    if (앞 !== null) console.error(`[kit] 앱이 20초 안에 앞에 뜨지 않았다 — 앞 화면: ${앞}`);
  } catch (err) {
    // 케이스는 driver 를 못 받아 닫지 못한다 — 여기서 닫아야 팜 폰이 연결 시간 동안 붙들리지 않는다
    await closeApp(driver).catch(() => undefined);
    throw new Error(`앱을 켜지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  return driver;
}

/** 시스템 권한 창의 꾸러미 — 기종 · OS 판마다 다르다. 이것이 앞에 떠도 앱은 켜진 것이다 */
const 권한창꾸러미 = ['com.google.android.permissioncontroller', 'com.android.permissioncontroller', 'com.android.packageinstaller'];

/**
 * 연결 응답의 꾸러미 이름 — APK 로 열면 Appium 이 매니페스트에서 읽어 채운다. 드라이버 판에 따라 appium: 이 붙어 온다.
 * 응답에 없으면 앱 값이 스토어 앱 패키지 이름일 때만 그것을 쓴다 — APK 는 이름을 알 길이 없다
 */
export function 연결꾸러미(caps: unknown, 앱값: string): string {
  const c = (caps ?? {}) as Record<string, unknown>;
  const 이름 = c.appPackage ?? c['appium:appPackage'];
  if (typeof 이름 === 'string' && 이름 !== '') return 이름;
  if (패키지이름인가(앱값)) return 앱값;
  throw new Error('Appium 이 앱 꾸러미 이름을 주지 않아 앱을 켤 수 없다');
}

type 켜기앞일 = '끈다' | '지운다' | null;

/**
 * 켜기 앞에 할 일. 데이터를 남기는 연결(keepAppData · 게임 항목)은 끈다 — 앞 케이스의 앱이 살아 있으면 앞으로 가져오기만 해 「앱만 다시 켜기」가 안 된다.
 * APK 를 새로 깐 연결은 앱 데이터를 한 번 더 지운다 — 백업이 켜진 폰은 설치 순간 Android 가 백업에서 옛 로그인을 되살린다(2026-11-16 S21 정식 실행 21136).
 * 복원은 설치가 끝나기 전에 끝나므로(Android 가 복원을 기다려 설치를 마친다) 연결이 열린 뒤 지우면 늦지 않다.
 * 스토어 앱은 깔지 않아 복원이 없고 Appium 이 이미 지웠다. 게임은 지우면 첫 실행 설정(서버 주소 등)이 날아간다 — 둘 다 아무것도 안 한다
 */
export function 켜기전에(caps: Record<string, unknown>, 게임: boolean): 켜기앞일 {
  if (caps['appium:noReset'] === true) return '끈다';
  return !게임 && typeof caps['appium:app'] === 'string' ? '지운다' : null;
}

type 실행기 = (script: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * 값을 실어 그 화면을 켠다. 못 켜면 false — 입구 화면이 없는 옛 APK 는 `am start` 가 던지지 않고 Error 글을 돌려준다.
 * 실은 값(토큰 등)은 알림에 싣지 않는다 (도메인/러너 §5.2 「값을 실어 켜기」)
 */
async function 실어켠다(실행: 실행기, 꾸러미: string, 값: AppLaunchIntent): Promise<boolean> {
  // adb 오류 글에는 am start 명령 줄이 통째로 들어 있다 — 실은 값을 가리고 알린다
  const 가림 = (글: string): string => Object.values(값.extras).reduce((g, v) => (v === '' ? g : g.split(v).join('***')), 글);
  try {
    const 답 = await 실행('mobile: startActivity', 화면켜기인자(꾸러미, 값.activity, 값.extras));
    // am start 는 실패해도 0 으로 끝나며 글로만 알린다 — 없는 화면(Error) · 안 열린 화면(SecurityException) · 안 켜짐(Warning)
    const 실패줄 = typeof 답 === 'string' ? 답.split('\n').find((줄) => /\b(Error|Exception)\b|Activity not started/.test(줄)) : undefined;
    if (실패줄 !== undefined) throw new Error(실패줄.trim());
    return true;
  } catch (err) {
    console.error(`[kit] 값을 실어 켜지 못해 그냥 켠다(${값.activity}): ${가림(err instanceof Error ? err.message : String(err))}`);
    return false;
  }
}

/**
 * 연결이 깔아 둔 앱을 켠다 — kit 케이스와 러너 화면 읽기가 같이 쓴다. `실행` 은 Appium `execute` 하나다(러너는 HTTP 로 넘긴다).
 * 켜기 앞에 할 일은 `켜기전에` 가 정한다. `값` 이 있으면 그 값을 실어 켜고, 못 실으면 그냥 켠다.
 * 앱이나 권한 창이 앞에 오면 null, 기다림이 끝나도 안 오면 마지막에 본 앞 화면 꾸러미를 돌려준다 — 던질지는 부른 쪽이 정한다.
 * 기다림은 켜기 앞 일(끄기 · 지우기)부터 센다 — admin 이 러너를 기다리는 시간(appScreen.ts 앱길)이 이 상한에 기댄다
 */
export async function 앱을켠다(
  실행: 실행기,
  꾸러미: string,
  먼저: 켜기앞일,
  { 값, 기다림_ms = 20_000, 간격_ms = 500 }: { 값?: AppLaunchIntent; 기다림_ms?: number; 간격_ms?: number } = {},
): Promise<string | null> {
  const 끝 = Date.now() + 기다림_ms;
  if (먼저 === '끈다') await 실행('mobile: terminateApp', { appId: 꾸러미 });
  if (먼저 === '지운다') {
    // 못 지워도 켠다 — 지우기는 폰 설정(백업 자동 복원)을 덮는 안전망이고, 실패로 케이스 전부를 막지 않는다
    await 실행('mobile: clearApp', { appId: 꾸러미 }).catch((err: unknown) =>
      console.error(`[kit] 앱 데이터를 지우지 못하고 켠다: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
  if (값 === undefined || !(await 실어켠다(실행, 꾸러미, 값))) await 실행('mobile: activateApp', { appId: 꾸러미 });
  let 앞 = '';
  do {
    앞 = String(await 실행('mobile: getCurrentPackage', {}));
    if (앞 === 꾸러미 || 권한창꾸러미.includes(앞)) return null;
    await new Promise((r) => setTimeout(r, 간격_ms));
  } while (Date.now() < 끝);
  return 앞;
}

function sessionFile(): string {
  return join(runDir(process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0'), APPIUM_SESSION_FILE);
}

/** 폰상태에서 가 되돌릴 요청을 적는 파일 — 연결 번호 파일 옆이라 러너가 같은 폴더에서 찾는다 */
export function phoneStateFile(): string {
  return join(sessionFile(), '..', PHONE_STATE_FILE);
}

// 러너가 케이스 프로세스를 죽여도 남은 연결을 닫을 수 있게 번호를 적어 둔다
async function writeSessionFile(sessionId: string): Promise<void> {
  try {
    const file = sessionFile();
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, `${sessionId}\n`);
    await writeFile(join(file, '..', APPIUM_SESSION_ID_FILE), `${sessionId}\n`);
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

const 글자 = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/**
 * 연결이 연 폰 · 앱의 판. 모델 · Android 판은 연결 응답에 오고, 앱 판은 폰에 묻는다.
 * 앱 판은 Appium 을 adb_shell 허용으로 켜야 읽힌다 — 못 읽으면 그 칸만 비우고 케이스는 그대로 돈다 (도메인/러너 §5.2 · APP-F1-05)
 */
export async function readDevice(driver: AppDriver): Promise<DeviceInfo> {
  const caps = driver.capabilities as Record<string, unknown>;
  // 드라이버 판에 따라 이름 앞에 appium: 이 붙어 오기도 한다
  const 칸 = (이름: string): string | null => 글자(caps[이름]) ?? 글자(caps[`appium:${이름}`]);
  const pkg = 칸('appPackage');
  // 앱 이름이 응답에 없으면 묻지 않는다 — 앞에 뜬 앱(런처 · 권한 창)에 물으면 남의 판이 증적에 박힌다
  if (pkg === null) return { model: 칸('deviceModel'), osVersion: 칸('platformVersion'), appVersion: null, appBuild: null, appPackage: null };
  let appVersion: string | null = null;
  let appBuild: string | null = null;
  try {
    const out = String(await driver.execute('mobile: shell', { command: 'dumpsys', args: ['package', pkg] }));
    appVersion = /versionName=(\S+)/.exec(out)?.[1] ?? null;
    appBuild = /versionCode=(\d+)/.exec(out)?.[1] ?? null;
  } catch (err) {
    console.error(`[kit] 앱 판을 읽지 못했다 — Appium 을 --allow-insecure=uiautomator2:adb_shell 로 켜야 한다: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { model: 칸('deviceModel'), osVersion: 칸('platformVersion'), appVersion, appBuild, appPackage: pkg };
}

export function captureApp(driver: AppDriver, seq: number, 요소?: unknown): Promise<string | undefined> {
  const id = typeof 요소 === 'string' ? 요소 : undefined;
  const 웹 = 웹요소인가(요소) ? 요소 : undefined;
  // 웹뷰 구간 안이거나 웹뷰 요소를 짚으면 폰 화면 전체를 네이티브로 찍고 웹 요소 자리를 옮긴다 — 웹 맥락 사진은 웹뷰 안만 나온다 (도메인/러너 §5.2 「범용 앱 부품」)
  return saveShot(seq, (path) => (웹맥락인가(driver) || 웹 !== undefined ? 웹뷰사진(driver, path, 웹) : 앱사진(driver, path, id)));
}
