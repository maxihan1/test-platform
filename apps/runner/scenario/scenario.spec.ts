// E2E 시나리오 고정 spec — 러너가 환경변수로 넘긴 조립 목록을 test() 하나 안에서 차례로 돈다 (SPEC 도메인/러너 §5.2)
// 시나리오마다 파일을 만들지 않는다. /tests 는 읽기 전용이고 기본 설정의 testDir 밖 파일은 잡히지 않는다 (2026-09-28 실측)

import { request, test } from '@playwright/test';
import type { ScenarioExecuteRequest } from '@platform/kit';

import { 새이음 } from './links.js';
import { runParts } from './parts.js';
import { 새폰자리 } from './phone.js';
import { 감싸기걸기 } from './window.js';
import { 기기줄, 뒷정리줄, 부품줄, 폰꺼냄 } from './wire.js';

const 목록 = JSON.parse(process.env.PLATFORM_SCENARIO ?? '[]') as ScenarioExecuteRequest['parts'];
const 삭제코드 = JSON.parse(process.env.PLATFORM_DELETE_STATUSES ?? '[]') as NonNullable<ScenarioExecuteRequest['deleteStatuses']>;

// 팜 토큰 · 어드민 키는 폰을 여는 데와 게임 단계에만 쓴다. 웹 단계 케이스 코드가 process.env 로 못 읽게 케이스를 불러오기 전에 떼어 둔다 (SPEC 도메인/시나리오 §3.7 결정 16)
const 폰열기환경 = { ...process.env };
const 어드민키 = process.env.PLATFORM_ADMIN_KEY ? (JSON.parse(process.env.PLATFORM_ADMIN_KEY) as NonNullable<ScenarioExecuteRequest['adminKey']>) : undefined;
delete process.env.PLATFORM_APPIUM_TOKEN;
delete process.env.PLATFORM_ADMIN_KEY;

// 부품마다 새 창을 직접 연다 — page · request fixture 는 테스트 하나에 하나뿐이다 (SPEC 도메인/시나리오 §3.7 결정 3)
test('E2E 시나리오', async ({ browser }, testInfo) => {
  const baseUrl = process.env.PLATFORM_BASE_URL ?? '';
  const 이음 = 새이음(목록, baseUrl, 삭제코드);
  const 적힌한도: unknown = testInfo.config.metadata['partTimeoutMs'];
  const partTimeoutMs = typeof 적힌한도 === 'number' ? 적힌한도 : 30_000;
  const 앱한도: unknown = testInfo.config.metadata['appPartTimeoutMs'];
  // 첫 앱 · 게임 단계가 부를 때 연다. 기기 줄은 열린 뒤 한 번 흘린다
  const 폰 = 새폰자리(폰꺼냄, 폰열기환경, (device) => {
    process.stdout.write(기기줄(device));
  });
  const 감싸기 = 감싸기걸기(browser, request, 이음, {
    baseUrl,
    platform: testInfo.project.name,
    기본머리: testInfo.project.use.extraHTTPHeaders,
    기본인증: testInfo.project.use.httpCredentials,
    폰,
    ...(어드민키 && { adminKey: 어드민키 }),
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
