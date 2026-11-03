// E2E 시나리오 고정 spec — 러너가 환경변수로 넘긴 조립 목록을 test() 하나 안에서 차례로 돈다 (SPEC 도메인/러너 §5.2)
// 시나리오마다 파일을 만들지 않는다. /tests 는 읽기 전용이고 기본 설정의 testDir 밖 파일은 잡히지 않는다 (2026-09-28 실측)

import { request, test } from '@playwright/test';
import type { ScenarioExecuteRequest } from '@platform/kit';

import { 새이음 } from './links.js';
import { runParts } from './parts.js';
import { 새폰자리 } from './phone.js';
import { 폰Chrome에붙는다 } from './realPhone.js';
import { 감싸기걸기 } from './window.js';
import { 기기줄, 뒷정리줄, 부품줄, 폰꺼냄 } from './wire.js';

const 목록 = JSON.parse(process.env.PLATFORM_SCENARIO ?? '[]') as ScenarioExecuteRequest['parts'];
const 삭제코드 = JSON.parse(process.env.PLATFORM_DELETE_STATUSES ?? '[]') as NonNullable<ScenarioExecuteRequest['deleteStatuses']>;

// 팜 토큰 · 어드민 키는 폰을 여는 데와 게임 단계에만 쓴다. 웹 단계 케이스 코드가 process.env 로 못 읽게 케이스를 불러오기 전에 떼어 둔다 (SPEC 도메인/시나리오 §3.7 결정 16)
const 폰열기환경 = { ...process.env };
const 어드민키 = process.env.PLATFORM_ADMIN_KEY ? (JSON.parse(process.env.PLATFORM_ADMIN_KEY) as NonNullable<ScenarioExecuteRequest['adminKey']>) : undefined;
// 작업 프로세스에서만 뗀다. Playwright 는 목록을 만들 때 본 프로세스에서도 이 파일을 읽는데, 거기서 지우면 뒤에 뜨는 작업 프로세스가
// 지워진 환경을 물려받아 폰을 못 연다 (2026-10-29 실행 20961 「인증 필요」)
if (process.env.TEST_WORKER_INDEX !== undefined) {
  delete process.env.PLATFORM_APPIUM_TOKEN;
  delete process.env.PLATFORM_ADMIN_KEY;
}

// 실제 폰 모바일 시나리오는 브라우저를 띄우지 않고 VISION 이 켜 준 폰 Chrome 에 붙는다. 토큰은 지우기 전에 떼어 둔 값으로 싣는다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
const 실제폰 = Boolean(폰열기환경.PLATFORM_CDP_URL);
const 시나리오 = !실제폰
  ? test
  : test.extend({
    browser: [
      async ({ playwright }, use) => {
        const b = await 폰Chrome에붙는다(playwright.chromium, 폰열기환경);
        await use(b);
        // 연결만 끊는다. Chrome 데이터는 VISION 이 폰을 놓을 때 지운다
        await b.close().catch((err: unknown) => console.warn(`[runner] 폰 Chrome 연결을 못 끊었다: ${err instanceof Error ? err.message : String(err)}`));
      },
      { scope: 'worker', timeout: 0 },
    ],
  });

// 창 하나 · 탭 하나를 직접 열어 끝까지 쓴다. 단계 request 와 단계 끝 되돌리기를 러너가 쥐어야 해서 page · request fixture 를 안 쓴다 (SPEC 도메인/시나리오 §3.7 결정 3)
시나리오('E2E 시나리오', async ({ browser }, testInfo) => {
  const baseUrl = process.env.PLATFORM_BASE_URL ?? '';
  const 이음 = 새이음(목록, baseUrl, 삭제코드);
  const 적힌한도: unknown = testInfo.config.metadata['partTimeoutMs'];
  const partTimeoutMs = typeof 적힌한도 === 'number' ? 적힌한도 : 30_000;
  const 앱한도: unknown = testInfo.config.metadata['appPartTimeoutMs'];
  // 첫 앱 · 게임 단계가 부를 때 연다. 기기 줄은 열린 뒤 한 번 흘린다
  const 폰 = 새폰자리(폰꺼냄, 폰열기환경, (device) => {
    process.stdout.write(기기줄(device));
  });
  // 폰 Chrome 의 판 — 모델 · Android 판은 러너가 VISION 기기 목록에서 채운다
  if (실제폰) process.stdout.write(기기줄({ model: null, osVersion: null, appVersion: null, browser: browser.version() || null }));
  const { use } = testInfo.project;
  const 감싸기 = 감싸기걸기(browser, request, 이음, {
    baseUrl,
    platform: testInfo.project.name,
    기본머리: use.extraHTTPHeaders,
    기본인증: use.httpCredentials,
    처음: {
      extraHTTPHeaders: use.extraHTTPHeaders, offline: use.offline, geolocation: use.geolocation, permissions: use.permissions,
      colorScheme: use.colorScheme, reducedMotion: use.reducedMotion, forcedColors: use.forcedColors, contrast: use.contrast,
      actionTimeout: use.actionTimeout, navigationTimeout: use.navigationTimeout,
    },
    폰,
    ...(어드민키 && { adminKey: 어드민키 }),
    ...(실제폰 && { 실제폰: { 영상: 폰열기환경.PLATFORM_PHONE_VIDEO ?? '' } }),
  });
  try {
    await runParts(목록, {
      baseUrl,
      partTimeoutMs,
      이음,
      newWindow: 감싸기.newWindow,
      appWindow: 감싸기.appWindow,
      ...(typeof 앱한도 === 'number' && { appPartTimeoutMs: 앱한도 }),
      sendDelete: 감싸기.sendDelete,
      // 워커의 stdout 은 Playwright 가 갈아치웠다. 전용 리포터가 onStdOut 으로 되돌려 써야 러너에 닿는다
      write: (result) => {
        process.stdout.write(부품줄(result));
      },
      writeCleanup: (list) => {
        process.stdout.write(뒷정리줄(list));
      },
    });
  } finally {
    // 미룬 뒷정리 뒤에 닫는다 — runParts 가 뒷정리까지 끝내고 돌아온다
    await 폰.닫기();
    감싸기.되돌리기();
  }
});
