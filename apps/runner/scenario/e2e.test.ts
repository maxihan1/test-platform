// 시나리오 실측 — 러너가 진짜 Playwright 자식을 띄워 가짜 케이스를 한 브라우저에서 잇는다. 인터넷 없이 돈다
// 워커 stdout 되돌려 쓰기 · kit 인스턴스 · 전용 설정의 testMatch 는 단위 검사로 원리상 안 보여 여기서만 잡힌다 (LEARNINGS 2026-09-21 [WS-C])
// desktop 만 돈다 — CI 는 chromium 만 받는다. 모바일(iPhone 은 webkit) 디바이스 판정은 kit scenario.test.ts 가 브라우저 없이 본다

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScenarioExecuteRequest } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { running } from '../src/execute.js';
import { executeScenario } from '../src/scenario.js';

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioExecuteRequest['parts'][number] => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps, filePath: join(fixtures, `${tcId}.case.ts`),
});
const trialId = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
const 요청 = (parts: ScenarioExecuteRequest['parts']): ScenarioExecuteRequest => ({
  runId: null, trialId, platform: 'desktop', baseUrl: 'https://xsf.invalid', parts, timeoutMs: 60_000,
});

let 산출물 = '';
const 옛값 = process.env.PLATFORM_ARTIFACTS_DIR;

beforeAll(() => {
  산출물 = mkdtempSync(join(tmpdir(), 'xsf-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 산출물;
});

afterAll(() => {
  if (옛값 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
  else process.env.PLATFORM_ARTIFACTS_DIR = 옛값;
  rmSync(산출물, { recursive: true, force: true });
});

describe('시나리오 실측 (브라우저)', () => {
  it('두 케이스를 한 브라우저에서 잇는다 — 「만들기」를 건너뛰면 앞 부품이 담은 것이 남아 있다', async () => {
    const 돌림 = executeScenario(요청([케이스('XSF-001'), 케이스('XSF-002', ['장바구니 화면을 세운다'])]));
    // 시나리오 자식은 진행 지도에 안 오른다 — /progress 에 안 뜬다 (SPEC 도메인/러너 §5.2)
    expect(running.size).toBe(0);
    const 결과 = await 돌림;

    expect(결과.status).toBe('PASS');
    expect(결과.parts.map((p) => [p.seq, p.status])).toEqual([[1, 'PASS'], [2, 'PASS']]);
    expect(결과.parts.flatMap((p) => p.steps.map((s) => [s.seq, s.title, s.skipped ?? false]))).toEqual([
      [1, '장바구니 화면을 세운다', false],
      [2, '하나를 담는다', false],
      [3, '장바구니 화면을 세운다', true],
      [4, '담긴 숫자를 본다', false],
    ]);
  }, 90_000);

  it('건너뛰지 않으면 준비가 다시 서서 틀린 조립이 빨강으로 멈추고, 실패 절차 사진은 시험 실행 폴더에 쌓인다', async () => {
    const 결과 = await executeScenario(요청([
      { kind: 'mock', urlPattern: 'https://xsf.invalid/**', status: 200, contentType: 'text/html; charset=utf-8', body: '<h1>화면</h1>' },
      케이스('XSF-001'), 케이스('XSF-002'), { kind: 'wait', ms: 1 },
    ]));

    expect(결과.status).toBe('FAIL');
    expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([
      [1, 'PASS', undefined], [2, 'PASS', undefined], [3, 'FAIL', undefined], [4, 'NA', 'NOT_RUN'],
    ]);
    expect(readdirSync(join(산출물, 'runs', 'trial', trialId))).toContain('4.png');
  }, 90_000);

  it('모킹은 브라우저 context 에 걸려 없는 주소도 적힌 응답으로 뜬다', async () => {
    const 결과 = await executeScenario(요청([
      { kind: 'mock', urlPattern: 'https://xsf.invalid/**', status: 200, contentType: 'text/html; charset=utf-8', body: '<h1>점검 중</h1>' },
      케이스('XSF-003'),
    ]));

    expect(결과.status).toBe('PASS');
    expect(결과.parts[1]!.mocks).toEqual(['https://xsf.invalid/**']);
  }, 90_000);
});
