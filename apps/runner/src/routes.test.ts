// 러너 HTTP 계약(SPEC §5.2)을 실제 요청으로 검사한다. 포트를 열지 않고 inject로 두드린다

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import type { ScenarioExecuteResponse, StepProgress } from '@platform/kit';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { execute, running, 진행을_모은다, type Running } from './execute.js';
import { killTree } from './kill.js';
import { registerRoutes } from './routes.js';
import { executeScenario } from './scenario.js';

// 입구가 실행에 무엇을 넘기는지만 본다. 진짜 실행은 자식 프로세스와 브라우저를 띄운다
vi.mock('./scenario.js', () => ({
  executeScenario: vi.fn(async (): Promise<ScenarioExecuteResponse> => ({ status: 'PASS', durationMs: 0, parts: [] })),
}));

vi.mock('./execute.js', async (원본) => ({
  ...(await 원본<typeof import('./execute.js')>()),
  execute: vi.fn(async () => ({ status: 'PASS', durationMs: 0 })),
}));

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

// 지도를 비우는 책임은 execute()의 finally에만 있고 이 테스트는 그 경로를 안 거친다.
// 단언이 깨져 끊는 자리까지 못 갔으면 자식이 30초를 더 산다. 비우기 전에 먼저 내린다
afterEach(() => {
  for (const { child } of running.values()) killTree(child);
  running.clear();
  vi.useRealTimers();
});

const 진행줄 = (p: StepProgress) => `@@PROGRESS@@${JSON.stringify(p)}\n`;

// cat 은 받은 것을 그대로 stdout 으로 돌려준다. 실제 자식 stdout 을 타야 갈아 끼우기가 증명된다
function 진행을_흘리는_자식(historyId: number) {
  const child = spawn('sh', ['-c', 'cat'], { detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const entry: Running = { child, killedBy: null };
  진행을_모은다(entry, child.stdout);
  running.set(historyId, entry);
  return child;
}

describe('GET /health', () => {
  it('이미지와 라이브러리 버전이 어긋났는지 보려고 playwright 버전을 같이 낸다', async () => {
    const res = await 서버().inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().playwrightVersion).toMatch(/^\d+\./);
  });
});

describe('POST /execute', () => {
  it('요청 형태가 계약과 다르면 400 INVALID_REQUEST다', async () => {
    const res = await 서버().inject({
      method: 'POST',
      url: '/execute',
      payload: { runId: '숫자가 아니다' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });

  it('android 를 받는다 — 브라우저가 아니라 폰에 붙는 종류도 같은 입구를 지난다', async () => {
    const res = await 서버().inject({
      method: 'POST',
      url: '/execute',
      payload: {
        runId: 1, historyId: 1, tcId: 'TODO-001', platform: 'android', filePath: 'todo/TODO-001.spec.ts',
        baseUrl: 'https://qa.example.com', params: {}, expected: {},
      },
    });

    expect(res.statusCode).not.toBe(400);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ platform: 'android' }), expect.any(String));
  });
});

describe('POST /abort', () => {
  it('이미 끝났거나 모르는 항목이면 200에 aborted false다', async () => {
    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: { historyId: 999 } });

    // 중단 요청과 정상 종료가 겹치는 것은 경합이지 고장이 아니다. 404면 admin이 정상 상황마다 에러를 받는다
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ aborted: false });
  });

  it('historyId가 없으면 400 INVALID_REQUEST다', async () => {
    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });

  it('돌고 있는 항목이면 자식을 끊고 200에 aborted true다', async () => {
    const child = spawn('sh', ['-c', 'sleep 30'], { detached: true, stdio: 'ignore' });
    running.set(42, { child, killedBy: null });

    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: { historyId: 42 } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ aborted: true });
    await once(child, 'close');
  });
});

describe('GET /progress', () => {
  it('지금 돌고 있는 항목의 seq·title·elapsedMs를 낸다', async () => {
    const child = 진행을_흘리는_자식(7);
    child.stdin.write(진행줄({ historyId: 7, seq: 3, title: '주문한다' }));
    await once(child.stdout, 'data');

    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    const [항목] = res.json().items;
    expect(항목.historyId).toBe(7);
    expect(항목.seq).toBe(3);
    expect(항목.title).toBe('주문한다');
    expect(항목.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('자식이 남의 historyId를 적어 보내도 러너가 아는 번호로 낸다', async () => {
    const child = 진행을_흘리는_자식(7);
    child.stdin.write(진행줄({ historyId: 9999, seq: 1, title: '남의 실행인 척한다' }));
    await once(child.stdout, 'data');

    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].historyId).toBe(7);
  });

  it('도는 것이 없으면 빈 목록이다', async () => {
    const 아무것도없음 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(아무것도없음.statusCode).toBe(200);
    expect(아무것도없음.json()).toEqual({ items: [] });

    진행을_흘리는_자식(8);
    const 아직안알림 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(아직안알림.json()).toEqual({ items: [] });
  });

  it('같은 항목의 다음 절차가 오면 앞 절차를 덮어쓴다', async () => {
    const child = 진행을_흘리는_자식(7);

    child.stdin.write(진행줄({ historyId: 7, seq: 1, title: '화면을 연다' }));
    await once(child.stdout, 'data');
    const 먼저 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(먼저.json().items).toHaveLength(1);
    expect(먼저.json().items[0].seq).toBe(1);

    child.stdin.write(진행줄({ historyId: 7, seq: 2, title: '로그인' }));
    await once(child.stdout, 'data');
    const 나중 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(나중.json().items).toHaveLength(1);
    expect(나중.json().items[0].seq).toBe(2);
    expect(나중.json().items[0].title).toBe('로그인');
  });

  it('elapsedMs는 그 절차가 시작된 뒤로 흐른 시간이지 항목이 시작된 뒤가 아니다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const child = 진행을_흘리는_자식(7);

    vi.setSystemTime(1_000_000);
    child.stdin.write(진행줄({ historyId: 7, seq: 1, title: '화면을 연다' }));
    await once(child.stdout, 'data');

    vi.setSystemTime(1_005_000);
    child.stdin.write(진행줄({ historyId: 7, seq: 2, title: '로그인' }));
    await once(child.stdout, 'data');

    vi.setSystemTime(1_005_300);
    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.json().items).toEqual([{ historyId: 7, seq: 2, title: '로그인', elapsedMs: 300 }]);
  });
});

describe('POST /execute-scenario — 입구 검사', () => {
  const trialId = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
  const 케이스 = (filePath?: string) => ({
    kind: 'case', tcId: 'TODO-001', params: {}, expected: {}, skipSteps: [], ...(filePath === undefined ? {} : { filePath }),
  });
  const 요청 = (칸: Record<string, unknown> = {}) => ({
    runId: 7, platform: 'desktop', baseUrl: 'https://qa.example.com', parts: [{ kind: 'wait', ms: 1 }], timeoutMs: 1000, ...칸,
  });
  const 보냄 = (payload: object) => 서버().inject({ method: 'POST', url: '/execute-scenario', payload });
  const 앞응답 = { fromSeq: 1, method: 'POST', urlPattern: '**/api/todos', jsonPath: 'data.id' };
  const 이어주는케이스 = (links: unknown[]) => ({ ...케이스('todo/TODO-001.spec.ts'), links });

  it.each([
    ['형태가 계약과 다르다', { runId: '숫자가 아니다' }],
    ['android 는 브라우저 시나리오에 못 쓴다', { platform: 'android' }],
    ['시험 실행인데 trialId 가 없다', { runId: null }],
    ['trialId 가 UUID 가 아니다 — 사진 폴더 경로에 그대로 들어간다', { runId: null, trialId: '../../etc' }],
    ['대기가 60초를 넘는다', { parts: [{ kind: 'wait', ms: 60_001 }] }],
    ['부품이 비었다', { parts: [] }],
    ['API 경로가 // 로 시작한다 — 대상 주소 밖으로 샌다', { parts: [{ kind: 'api', method: 'GET', path: '//evil.example/x', expectStatus: 200 }] }],
    ['API 경로가 / 로 시작하지 않는다', { parts: [{ kind: 'api', method: 'GET', path: 'x', expectStatus: 200 }] }],
    ['케이스 부품에 파일 경로가 없다', { parts: [케이스()] }],
    ['케이스 파일이 테스트 뿌리 밖이다', { parts: [케이스('../package.json')] }],
    ['조립 목록이 너무 크다 — 환경변수 하나로 넘긴다', {
      parts: [{ kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: 'x'.repeat(120_001) }],
    }],
    ['조립 목록이 바이트로 너무 크다 — 한글은 한 글자가 3바이트다', {
      parts: [{ kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: '가'.repeat(45_000) }],
    }],
    ['제한 시간이 60분을 넘는다', { timeoutMs: 3_600_001 }],
    ['이어 주기 종류를 모른다', { parts: [이어주는케이스([{ kind: 'teleport', method: 'GET', urlPattern: '**/a' }])] }],
    ['바꿔 보내기 경로가 // 로 시작한다 — 대상 주소 밖으로 샌다', { parts: [이어주는케이스([
      { kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PUT', path: '//evil.example/x', value: 앞응답 } },
    ])] }],
    ['바꿔 보내기 경로에 {} 자리가 없다 — 앞 데이터가 아니라 모음 주소로 간다', { parts: [이어주는케이스([
      { kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PUT', path: '/api/todos', value: 앞응답 } },
    ])] }],
    ['바꿔 보내기 경로에 {} 자리가 둘이다 — 첫 자리만 바뀐다', { parts: [이어주는케이스([
      { kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PUT', path: '/api/{}/items/{}', value: 앞응답 } },
    ])] }],
    ['앞 응답 돌려주기가 0번 부품을 가리킨다', { parts: [이어주는케이스([{ kind: 'reuse', method: 'GET', urlPattern: '**/a', fromSeq: 0 }])] }],
    ['값 꽂기가 0번 부품을 가리킨다', { parts: [이어주는케이스([{ kind: 'bind', param: 'todoId', value: { ...앞응답, fromSeq: 0 } }])] }],
  ])('%s 이면 400 INVALID_REQUEST 다', async (_이름, 칸) => {
    const res = await 보냄(요청(칸));

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });

  it('넘겨받기 끔과 이어 주기 넷을 버리지 않고 실행에 넘긴다', async () => {
    const 이어주기 = [
      { kind: 'reuse', method: 'POST', urlPattern: '**/api/todos', fromSeq: 1 },
      { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' },
      { kind: 'rewrite', method: 'POST', urlPattern: '**/api/todos', to: { method: 'PUT', path: '/api/todos/{}', value: 앞응답 } },
      { kind: 'bind', param: 'todoId', value: 앞응답 },
    ];
    const 부품 = [{ ...케이스('todo/TODO-001.spec.ts'), carryOver: false }, 이어주는케이스(이어주기)];

    const res = await 보냄(요청({ parts: 부품 }));

    expect(res.statusCode).toBe(200);
    expect(executeScenario).toHaveBeenCalledWith(expect.objectContaining({
      parts: [expect.objectContaining({ carryOver: false }), expect.objectContaining({ links: 이어주기 })],
    }));
  });

  it('케이스 파일이 없으면 404 CASE_NOT_FOUND 다', async () => {
    const res = await 보냄(요청({ runId: null, trialId, parts: [케이스('todo/없는-케이스.spec.ts')] }));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'CASE_NOT_FOUND', detail: 'todo/없는-케이스.spec.ts' });
  });
});
