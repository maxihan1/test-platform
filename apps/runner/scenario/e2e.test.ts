// 시나리오 실측 — 러너가 진짜 Playwright 자식을 띄워 가짜 케이스를 창 하나로 잇는다. 인터넷 없이 돈다(로컬 실측 서버 · 모킹)
// 워커 stdout 되돌려 쓰기 · kit 인스턴스 · 전용 설정의 testMatch · 창 바꿔 끼우기는 단위 검사로 원리상 안 보여 여기서만 잡힌다 (LEARNINGS 2026-09-21 [WS-C])
// desktop 만 돈다 — CI 는 chromium 만 받는다. 모바일(iPhone 은 webkit) 디바이스 판정은 kit scenario.test.ts 가 브라우저 없이 본다

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
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
const 케이스 = (tcId: string, skipSteps: string[] = [], links?: ScenarioLink[]): Extract<Part, { kind: 'case' }> => ({
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
  // 2026-11-03 TMO 에 결정 3 이 다시 「창 하나 · 탭 하나로 끝까지」다(2026-10-06 판은 부품마다 새 창).
  // 이어받는 값은 localStorage 에 둔 그대로다. 건너뛰면 앞 부품 것이 남는다는 단언도 그대로다
  it('두 케이스를 같은 창으로 잇는다 — 「만들기」를 건너뛰면 앞 부품이 담은 것이 남아 있다', async () => {
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

  it('로그인 상태 · 값 꽂기 · 뒷정리 미루기 — finally 의 page.request 상대 주소 삭제가 시나리오 끝에 로그인한 채 나간다', async () => {
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

  it('미룬 삭제는 요청의 deleteStatuses 코드로 답하고, 없으면 204 다 — 204 만 받는 정리 함수가 지나간다', async () => {
    const 서버 = await 서버열기();
    try {
      const 기본 = await executeScenario(요청([케이스('XSF-008')], 서버.url));
      expect(기본.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined]]);

      const 배운코드 = [{ host: new URL(서버.url).host, path: '/api/posts/:n', status: 200 }];
      const 배움 = await executeScenario({ ...요청([케이스('XSF-008')], 서버.url), deleteStatuses: 배운코드 });
      expect(배움.parts[0]).toMatchObject({ status: 'FAIL', error: { message: expect.stringContaining('글 지우기 실패: 200') as unknown } });
    } finally {
      await 서버.닫기();
    }
  }, 90_000);

  // 창 하나로 끝까지 돈다 — 앞 단계 화면에서 이어 시작하고, 앞 단계가 건 시계 · 주입 스크립트 · 가로채기 · 새 탭은 단계 끝에 되돌린다 (시나리오 §3.7 결정 3 「단계 끝 되돌리기」)
  it('다음 단계는 같은 탭에서 이어 시작하고, 앞 단계가 건 것은 되돌려져 있고 로그인 상태는 이어진다', async () => {
    const 서버 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([케이스('XSF-012'), 케이스('XSF-013')], 서버.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'PASS', undefined]]);
      expect(결과.parts[1]!.steps.map((s) => s.status)).toEqual(['PASS', 'PASS', 'PASS', 'PASS']);
    } finally {
      await 서버.닫기();
    }
  }, 90_000);

  it('넘겨받기를 끈 단계는 같은 창에서 쿠키 · localStorage · 지금 탭 sessionStorage 를 비우고 시작한다', async () => {
    const 서버 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([케이스('XSF-012'), { ...케이스('XSF-014'), carryOver: false }], 서버.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'PASS', undefined]]);
    } finally {
      await 서버.닫기();
    }
  }, 90_000);

  // 창의 기준 주소는 시작 애플리케이션으로 굳는다 — 러너가 goto · 주소 맞추기 칸 · page.request 를 그 단계 주소로 푼다. 내부 칸이라 판을 올리면 여기서 깨진다 (러너 §5.2 「창 하나로 끝까지」)
  it('섞인 시나리오의 다른 애플리케이션 단계는 상대 주소 열기 · 기다리기 · page.request 가 그 애플리케이션으로 간다', async () => {
    const 쇼핑몰 = await 서버열기();
    const 어드민 = await 서버열기();
    try {
      const 결과 = await executeScenario(요청([케이스('XSF-001'), { ...케이스('XSF-015'), baseUrl: 어드민.url }], 쇼핑몰.url));

      expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'PASS', undefined]]);
      expect(어드민.기록.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /?step=2', 'GET /api/xsf-mix']);
      expect(쇼핑몰.기록.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /']);
    } finally {
      await 쇼핑몰.닫기();
      await 어드민.닫기();
    }
  }, 90_000);

  // 고정 spec 이 kit 의 장면걸기를 진짜 탭에 거는지 — 단위 검사의 가짜 탭으로는 Playwright 작업자 안에서 장면이 오는지 못 본다 (러너 §5.2 「테스트 모드 — 실시간 장면」)
  it('테스트 모드(live)는 첫 탭의 장면을 live/<열쇠>.jpg 에 쓰며 돈다', async () => {
    const 서버 = await 서버열기();
    const 파일 = join(산출물, 'live', `${trialId}.jpg`);
    let 봤다 = false;
    const 지켜봄 = setInterval(() => {
      봤다 ||= existsSync(파일);
    }, 50);
    try {
      const 결과 = await executeScenario({ ...요청([케이스('XSF-001')], 서버.url), live: trialId });
      expect(결과.status).toBe('PASS');
      expect(봤다).toBe(true);
    } finally {
      clearInterval(지켜봄);
      rmSync(join(산출물, 'live'), { recursive: true, force: true });
      await 서버.닫기();
    }
  }, 90_000);

  // Playwright 는 목록을 만들 때 본 프로세스에서도 고정 spec 을 읽는다. 거기서 토큰을 지우면 작업 프로세스가 지워진 환경을 물려받는다 (2026-10-29 실행 20961)
  it('앱 단계의 폰 열기는 러너가 넘긴 팜 토큰을 받는다', async () => {
    const 이전 = process.env.PLATFORM_APPIUM_TOKEN;
    process.env.PLATFORM_APPIUM_TOKEN = 'xsf-farm-token';
    try {
      const 결과 = await executeScenario({ ...요청([{ ...케이스('XSF-011'), appStep: true }]), platform: 'android' });
      expect(결과.parts[0]!.error?.message ?? 결과.parts[0]!.error?.stack).toContain('폰 열기 토큰=xsf-farm-token');
    } finally {
      if (이전 === undefined) delete process.env.PLATFORM_APPIUM_TOKEN;
      else process.env.PLATFORM_APPIUM_TOKEN = 이전;
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
