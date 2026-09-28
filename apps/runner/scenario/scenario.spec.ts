// E2E 시나리오 고정 spec — 러너가 환경변수로 넘긴 조립 목록을 test() 하나 안에서 차례로 돈다 (SPEC 도메인/러너 §5.2)
// 시나리오마다 파일을 만들지 않는다. /tests 는 읽기 전용이고 기본 설정의 testDir 밖 파일은 잡히지 않는다 (2026-09-28 실측)

import { pathToFileURL } from 'node:url';

import { test } from '@playwright/test';
import type { ScenarioExecuteRequest } from '@platform/kit';
import { scenarioCase } from '@platform/kit/scenario';

import { runParts } from './parts.js';

const 목록 = JSON.parse(process.env.PLATFORM_SCENARIO ?? '[]') as ScenarioExecuteRequest['parts'];

test('E2E 시나리오', async ({ page, request }, testInfo) => {
  await runParts(목록, {
    baseUrl: process.env.PLATFORM_BASE_URL ?? '',
    context: {
      route: async (url, handler) => {
        await page.context().route(url, handler);
      },
      unroute: (url, handler) => page.context().unroute(url, handler),
    },
    page,
    // API 부품은 브라우저 로그인(쿠키)을 같이 쓴다 (2026-09-28 사용자)
    fetch: (url, options) => page.request.fetch(url, options),
    runCase: async (part, seq) => {
      // 같은 케이스를 두 번 쓰면 두 번째 import 는 캐시다. 등록부가 안 지우므로 그대로 꺼내진다
      await import(pathToFileURL(part.filePath ?? '').href);
      const run = scenarioCase(part.tcId);
      if (run === undefined) throw new Error(`${part.filePath ?? '(경로 없음)'} 가 ${part.tcId} 를 등록하지 않았다`);
      return run({
        page,
        // 케이스 본체의 request 는 단독으로 돌 때와 같은 것을 준다 — 케이스의 뜻이 조립에 따라 바뀌면 안 된다
        request,
        platform: testInfo.project.name,
        params: part.params,
        expected: part.expected,
        skipSteps: part.skipSteps,
        seq,
      });
    },
    // 워커의 stdout 은 Playwright 가 갈아치웠다. 전용 리포터가 onStdOut 으로 되돌려 써야 러너에 닿는다
    write: (line) => {
      process.stdout.write(line);
    },
  });
});
