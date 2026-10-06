// 시나리오 실측 — 러너가 진짜 Playwright 자식을 띄워 가짜 케이스를 부품마다 새 창으로 잇는다. 인터넷 없이 돈다(로컬 실측 서버 · 모킹)
// 워커 stdout 되돌려 쓰기 · kit 인스턴스 · 전용 설정의 testMatch · 창 바꿔 끼우기는 단위 검사로 원리상 안 보여 여기서만 잡힌다 (LEARNINGS 2026-09-21 [WS-C])
// desktop 만 돈다 — CI 는 chromium 만 받는다. 모바일(iPhone 은 webkit) 디바이스 판정은 kit scenario.test.ts 가 브라우저 없이 본다

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import type { ScenarioExecuteRequest, ScenarioLink } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { running } from '../src/execute.js';
import { executeScenario } from '../src/scenario.js';
import { 서버열기 } from './e2e-server.js';
import { 무늬맞음 } from './links.js';

type Part = ScenarioExecuteRequest['parts'][number];

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const 케이스 = (tcId: string, skipSteps: string[] = [], links?: ScenarioLink[]): Part => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps, filePath: join(fixtures, `${tcId}.case.ts`),
  ...(links === undefined ? {} : { links }),
});
const 모킹 = (urlPattern: string, body: string): Part => ({
  kind: 'mock', urlPattern, status: 200, contentType: 'application/json', body,
});
const trialId = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
const 요청 = (parts: Part[], baseUrl = 'https://xsf.invalid'): ScenarioExecuteRequest => ({
  runId: null, trialId, platform: 'desktop', baseUrl, parts, timeoutMs: 60_000,
});
const 첫글 = { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts', jsonPath: 'id' } as const;

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
  // 2026-10-06 결정 3 이 「한 창에서 이어 돈다」를 「부품마다 새 창 · 로그인 상태만 옮긴다」로 바꿨다.
  // 그래서 이어받는 값을 화면 글자에서 localStorage 로 옮겼다. 건너뛰면 앞 부품 것이 남는다는 단언은 그대로다
  it('두 케이스를 부품마다 새 창으로 잇는다 — 「만들기」를 건너뛰면 앞 부품이 담은 것이 남아 있다', async () => {
    const 서버 = await 서버열기();
    try {
      const 돌림 = executeScenario(요청([케이스('XSF-001'), 케이스('XSF-002', ['장바구니 화면을 세운다'])], 서버.url));
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
    } finally {
      await 서버.닫기();
    }
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

  it('새 창 · 로그인 상태 · 값 꽂기 · 뒷정리 미루기 — finally 의 page.request 상대 주소 삭제가 시나리오 끝에 로그인한 채 나간다', async () => {
    const 서버 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([
        케이스('XSF-004'),
        케이스('XSF-005', [], [{ kind: 'bind', param: '글번호', value: 첫글 }]),
      ], 서버.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'PASS', undefined]]);
      expect(결과.parts[1]!.bound).toEqual({ 글번호: 812 });
      expect(결과.cleanup).toEqual([{ fromSeq: 1, method: 'DELETE', url: `${서버.url}/api/posts/812`, status: 200 }]);
      const 순서 = 서버.기록.map((r) => `${r.method} ${r.path}`);
      expect(순서.indexOf('DELETE /api/posts/812')).toBeGreaterThan(순서.indexOf('GET /api/posts/812'));
      expect(서버.기록.filter((r) => r.method === 'DELETE').map((r) => r.로그인)).toEqual([true]);
    } finally {
      await 서버.닫기();
    }
  }, 90_000);

  it('요청 막기 · 바꿔 보내기는 준비 구간에만 건다 — 판정 뒤 같은 요청은 모킹이 받는다', async () => {
    const 서버 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([
        케이스('XSF-004'),
        모킹('**/api/cart', '{"모킹":true}'),
        케이스('XSF-006', [], [
          { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' },
          { kind: 'rewrite', method: 'POST', urlPattern: '**/api/posts', to: { method: 'PUT', path: '/api/posts/{}', value: 첫글 } },
        ]),
      ], 서버.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([
        [1, 'PASS', undefined], [2, 'PASS', undefined], [3, 'PASS', undefined],
      ]);
      const 순서 = 서버.기록.map((r) => `${r.method} ${r.path}`);
      expect(순서.filter((s) => s === 'POST /api/posts')).toHaveLength(1);
      expect(순서).toContain('PUT /api/posts/812');
      expect(순서).not.toContain('DELETE /api/cart');
    } finally {
      await 서버.닫기();
    }
  }, 90_000);

  it('케이스가 직접 만든 API 연결 · 창에도 모킹과 뒷정리 미루기가 걸린다', async () => {
    const 서버 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([모킹('**/api/mocked', '{"모킹":true}'), 케이스('XSF-007')], 서버.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'PASS', undefined]]);
      expect(결과.cleanup).toEqual([{ fromSeq: 2, method: 'DELETE', url: `${서버.url}/api/posts/812`, status: 200 }]);
      expect(서버.기록.at(-1)).toMatchObject({ method: 'DELETE', path: '/api/posts/812', 로그인: true });
    } finally {
      await 서버.닫기();
    }
  }, 90_000);
});

describe('무늬 맞추기 대조 (브라우저)', () => {
  it('이어 주기 무늬는 브라우저 route 와 같게 맞는다 — API 쪽만 다르면 막기 · 바꿔 보내기가 조용히 안 걸린다', async () => {
    const 기준 = 'https://xsf.invalid/shop/';
    const 쌍: Array<[string, string]> = [
      ['**/api/posts', 'https://xsf.invalid/api/posts'],
      ['**/api/posts', 'https://xsf.invalid/api/posts/1'],
      ['**/api/posts/*', 'https://xsf.invalid/api/posts/1'],
      ['https://xsf.invalid/api/*', 'https://xsf.invalid/api/a'],
      ['https://xsf.invalid/api/*', 'https://xsf.invalid/api/a/b'],
      ['**/api/{posts,comments}', 'https://xsf.invalid/api/comments'],
      ['/api/*', 'https://xsf.invalid/api/a'],
      ['**/api/cart', 'https://xsf.invalid/api/cart?x=1'],
    ];
    const 브라우저 = await chromium.launch();
    try {
      const 창 = await 브라우저.newContext({ baseURL: 기준 });
      const 판정: Array<[string, string, boolean]> = [];
      for (const [무늬, url] of 쌍) {
        await 창.route('**/*', (r) => r.fulfill({ contentType: 'text/plain', body: 'miss' }));
        await 창.route(무늬, (r) => r.fulfill({ contentType: 'text/plain', body: 'hit' }));
        const page = await 창.newPage();
        await page.goto(url);
        판정.push([무늬, url, (await page.innerText('body')) === 'hit']);
        await page.close();
        await 창.unrouteAll();
      }

      expect(쌍.map(([무늬, url]) => [무늬, url, 무늬맞음(무늬, url, 기준)])).toEqual(판정);
    } finally {
      await 브라우저.close();
    }
  }, 90_000);
});
