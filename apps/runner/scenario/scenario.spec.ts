// E2E 시나리오 고정 spec — 러너가 환경변수로 넘긴 조립 목록을 test() 하나 안에서 차례로 돈다 (SPEC 도메인/러너 §5.2)
// 시나리오마다 파일을 만들지 않는다. /tests 는 읽기 전용이고 기본 설정의 testDir 밖 파일은 잡히지 않는다 (2026-09-28 실측)

import { request, test } from '@playwright/test';
import type { ScenarioExecuteRequest } from '@platform/kit';

import { 새이음 } from './links.js';
import { runParts } from './parts.js';
import { 감싸기걸기 } from './window.js';
import { 뒷정리줄, 부품줄 } from './wire.js';

const 목록 = JSON.parse(process.env.PLATFORM_SCENARIO ?? '[]') as ScenarioExecuteRequest['parts'];

// 부품마다 새 창을 직접 연다 — page · request fixture 는 테스트 하나에 하나뿐이다 (SPEC 도메인/시나리오 §3.7 결정 3)
test('E2E 시나리오', async ({ browser }, testInfo) => {
  const baseUrl = process.env.PLATFORM_BASE_URL ?? '';
  const 이음 = 새이음(목록, baseUrl);
  const 한도: unknown = testInfo.config.metadata['partTimeoutMs'];
  const 감싸기 = 감싸기걸기(browser, request, 이음, baseUrl, testInfo.project.name);
  try {
    await runParts(목록, {
      baseUrl,
      partTimeoutMs: typeof 한도 === 'number' ? 한도 : 30_000,
      이음,
      newWindow: (state, mocks, 부품) => 감싸기.newWindow(state, mocks, 부품),
      sendDelete: (d) => 감싸기.sendDelete(d),
      // 워커의 stdout 은 Playwright 가 갈아치웠다. 전용 리포터가 onStdOut 으로 되돌려 써야 러너에 닿는다
      write: (result) => {
        process.stdout.write(부품줄(result));
      },
      writeCleanup: (list) => {
        process.stdout.write(뒷정리줄(list));
      },
    });
  } finally {
    감싸기.되돌리기();
  }
});
