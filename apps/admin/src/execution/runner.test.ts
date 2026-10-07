// 러너 호출이 SPEC §5.2 계약대로 나가고, 러너가 죽거나 거절해도 그 항목만 NA로 접히는지 본다.
// 진짜 러너 대신 같은 계약을 흉내내는 서버를 띄운다 — 컨테이너 없이도 돌아야 하는 검사다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import type { ExecuteRequest, ScenarioExecuteRequest } from '@platform/kit';

import { abortRunner, callRunner, callScenarioRunner, httpTimeoutMs, 러너에보낸다, 진행 } from './runner.js';
import type { PendingItem } from './store.js';

const 항목: PendingItem = {
  historyId: 42,
  tcId: 'DEMO-001',
  platform: 'desktop',
  filePath: 'demo/DEMO-001.spec.ts',
  baseUrl: 'https://qa.example.com',
  params: { 아이디: 'tester' },
  expected: { 결과: true },
  timeoutMs: 5000,
};

let 가짜러너: FastifyInstance | null = null;
let 가짜로컬러너: FastifyInstance | null = null;

async function 붙인다(app: FastifyInstance): Promise<void> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
  가짜러너 = app;
}

async function 띄운다(handler: (body: ExecuteRequest) => Promise<unknown> | unknown): Promise<void> {
  const app = Fastify();
  app.post('/execute', async (req, reply) => {
    const out = await handler(req.body as ExecuteRequest);
    if (typeof out === 'object' && out !== null && 'code' in out) {
      const { code, body } = out as { code: number; body: unknown };
      return reply.code(code).send(body);
    }
    return out;
  });
  await 붙인다(app);
}

async function 진행띄운다(code: number, body: unknown): Promise<void> {
  const app = Fastify();
  app.get('/progress', async (_req, reply) => reply.code(code).send(body));
  await 붙인다(app);
}

async function 로컬붙인다(app: FastifyInstance): Promise<void> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  process.env.LOCAL_RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
  가짜로컬러너 = app;
}

afterEach(async () => {
  await 가짜러너?.close();
  가짜러너 = null;
  await 가짜로컬러너?.close();
  가짜로컬러너 = null;
  delete process.env.RUNNER_URL;
  delete process.env.LOCAL_RUNNER_URL;
});

describe('callRunner', () => {
  it('HTTP 제한 시간은 러너 제한 시간보다 30초 길다', () => {
    // 러너가 먼저 끊어야 부분 결과가 남는다 (SPEC §5.2)
    expect(httpTimeoutMs(5000)).toBe(35_000);
    expect(httpTimeoutMs(300_000)).toBe(330_000);
  });

  it('ExecuteRequest 모양 그대로 보낸다', async () => {
    let 받은것: ExecuteRequest | null = null;
    await 띄운다((body) => {
      받은것 = body;
      return { historyId: body.historyId, status: 'PASS', durationMs: 1, steps: [] };
    });

    await callRunner(7, 항목);
    expect(받은것).toEqual({
      runId: 7,
      historyId: 42,
      tcId: 'DEMO-001',
      platform: 'desktop',
      filePath: 'demo/DEMO-001.spec.ts',
      baseUrl: 'https://qa.example.com',
      params: { 아이디: 'tester' },
      expected: { 결과: true },
      timeoutMs: 5000,
    });
  });

  it('200이면 러너가 만든 판정을 그대로 돌려준다', async () => {
    await 띄운다(() => ({
      historyId: 42,
      status: 'FAIL',
      durationMs: 1234,
      steps: [{ seq: 1, title: '연다', status: 'FAIL', durationMs: 9, assertions: [] }],
    }));

    const res = await callRunner(7, 항목);
    expect(res.status).toBe('FAIL');
    expect(res.steps).toHaveLength(1);
  });

  it('타임아웃도 러너가 200으로 알려준다. 그대로 싣는다', async () => {
    await 띄운다(() => ({ historyId: 42, status: 'NA', durationMs: 5010, steps: [], error: { message: 'TIMEOUT' } }));

    const res = await callRunner(7, 항목);
    expect(res.status).toBe('NA');
    expect(res.error?.message).toBe('TIMEOUT');
  });

  it('러너가 고장나면 그 항목만 NA로 접고 사유를 남긴다', async () => {
    await 띄운다(() => ({ code: 500, body: { error: 'RUNNER_ERROR', detail: '자식 프로세스를 못 띄웠다' } }));

    const res = await callRunner(7, 항목);
    expect(res.status).toBe('NA');
    expect(res.historyId).toBe(42);
    expect(res.steps).toEqual([]);
    expect(res.error?.message).toContain('RUNNER_ERROR');
    expect(res.error?.message).toContain('자식 프로세스를 못 띄웠다');
  });

  it('케이스 파일이 없다는 404도 NA와 사유로 남는다', async () => {
    await 띄운다(() => ({ code: 404, body: { error: 'CASE_NOT_FOUND', detail: 'demo/DEMO-001.spec.ts' } }));

    const res = await callRunner(7, 항목);
    expect(res.status).toBe('NA');
    expect(res.error?.message).toContain('demo/DEMO-001.spec.ts');
  });

  it('러너에 아예 못 붙어도 던지지 않는다. 나머지 항목이 계속 돌아야 한다', async () => {
    process.env.RUNNER_URL = 'http://127.0.0.1:9';

    const res = await callRunner(7, 항목);
    expect(res.status).toBe('NA');
    expect(res.historyId).toBe(42);
    // 목록에 그대로 쓰이는 문장이다. 원문 오류는 상세의 접힌 자리로 간다 (SPEC §8.3)
    expect(res.error?.message).toBe('러너에 닿지 못했습니다');
    expect(res.error?.stack).toBeTruthy();
  });
});

describe('callRunner — 어느 러너로 가는가', () => {
  async function 이름띄운다(붙임: (app: FastifyInstance) => Promise<void>, 불렸다: string[], 이름: string): Promise<void> {
    const app = Fastify();
    app.post('/execute', async (req) => {
      불렸다.push(이름);
      return { historyId: (req.body as ExecuteRequest).historyId, status: 'PASS', durationMs: 1, steps: [] };
    });
    await 붙임(app);
  }

  it('android 항목은 LOCAL_RUNNER_URL 로, desktop 은 RUNNER_URL 로 간다', async () => {
    const 불렸다: string[] = [];
    await 이름띄운다(붙인다, 불렸다, '컨테이너');
    await 이름띄운다(로컬붙인다, 불렸다, '로컬');

    await callRunner(7, { ...항목, platform: 'android' });
    expect(불렸다).toEqual(['로컬']);
    await callRunner(7, 항목);
    expect(불렸다).toEqual(['로컬', '컨테이너']);
  });

  it('android 인데 LOCAL_RUNNER_URL 이 비면 러너를 부르지 않고 NA 로 접는다', async () => {
    const 불렸다: string[] = [];
    await 이름띄운다(붙인다, 불렸다, '컨테이너');

    const res = await callRunner(7, { ...항목, platform: 'android' });
    expect(불렸다).toEqual([]);
    expect(res.status).toBe('NA');
    expect(res.historyId).toBe(42);
    expect(res.error?.message).toBe('이 서버에는 Android 앱을 돌릴 로컬 러너(LOCAL_RUNNER_URL)가 없다');
  });
});

describe('abortRunner', () => {
  async function 끊김띄운다(붙임: (app: FastifyInstance) => Promise<void>, 받은것: number[]): Promise<void> {
    const app = Fastify();
    app.post('/abort', async (req) => {
      받은것.push((req.body as { historyId: number }).historyId);
      return { aborted: true };
    });
    await 붙임(app);
  }

  it('android 는 로컬 러너에만, desktop 은 컨테이너에만 보낸다', async () => {
    const 컨테이너: number[] = [];
    const 로컬: number[] = [];
    await 끊김띄운다(붙인다, 컨테이너);
    await 끊김띄운다(로컬붙인다, 로컬);

    expect(await abortRunner(1, 'android')).toBe(true);
    expect({ 컨테이너, 로컬 }).toEqual({ 컨테이너: [], 로컬: [1] });
    expect(await abortRunner(2, 'desktop')).toBe(true);
    expect({ 컨테이너, 로컬 }).toEqual({ 컨테이너: [2], 로컬: [1] });
  });

  it('android 인데 로컬 러너 주소가 없으면 어디에도 보내지 않고 false 다', async () => {
    const 컨테이너: number[] = [];
    await 끊김띄운다(붙인다, 컨테이너);

    expect(await abortRunner(1, 'android')).toBe(false);
    expect(컨테이너).toEqual([]);
  });
});

describe('callScenarioRunner', () => {
  const 요청: ScenarioExecuteRequest = {
    runId: 9,
    platform: 'desktop',
    baseUrl: 'https://qa.example.com',
    parts: [{ kind: 'wait', ms: 10 }],
    timeoutMs: 60000,
  };

  async function 시나리오띄운다(code: number, body: unknown, 받은것?: { 본문: unknown }): Promise<void> {
    const app = Fastify();
    app.post('/execute-scenario', async (req, reply) => {
      if (받은것 !== undefined) 받은것.본문 = req.body;
      return reply.code(code).send(body);
    });
    await 붙인다(app);
  }

  it('/execute-scenario 에 요청을 그대로 싣고 러너 응답을 돌려준다', async () => {
    const 받은것 = { 본문: null as unknown };
    const 응답 = { status: 'PASS', durationMs: 12, parts: [{ seq: 1, status: 'PASS', durationMs: 10, steps: [], mocks: [] }] };
    await 시나리오띄운다(200, 응답, 받은것);

    expect(await callScenarioRunner(요청)).toEqual(응답);
    expect(받은것.본문).toEqual(요청);
  });

  it('러너가 거절하면 부품을 비운 NA 와 케이스와 같은 문장으로 돌려준다', async () => {
    await 시나리오띄운다(400, { error: 'INVALID_REQUEST', detail: 'parts 가 비었다' });

    const res = await callScenarioRunner(요청);
    expect(res.status).toBe('NA');
    expect(res.parts).toEqual([]);
    expect(res.error?.message).toBe('러너가 거절했다: INVALID_REQUEST — parts 가 비었다');
  });

  it('러너에 닿지 못해도 던지지 않는다. 원문은 stack 으로 간다', async () => {
    process.env.RUNNER_URL = 'http://127.0.0.1:9';

    const res = await callScenarioRunner(요청);
    expect(res.status).toBe('NA');
    expect(res.parts).toEqual([]);
    expect(res.error?.message).toBe('러너에 닿지 못했습니다');
    expect(res.error?.stack).toBeTruthy();
  });
});

describe('러너에보낸다', () => {
  async function 늦게띄운다(지연ms: number): Promise<void> {
    const app = Fastify();
    app.post('/execute', async () => {
      await new Promise((r) => setTimeout(r, 지연ms));
      return { 늦었다: true };
    });
    await 붙인다(app);
  }

  it('경로와 본문을 그대로 보내고 상태와 JSON 을 돌려준다', async () => {
    const 받은것 = { 본문: null as unknown };
    const app = Fastify();
    app.post('/execute-scenario', async (req, reply) => {
      받은것.본문 = req.body;
      return reply.code(201).send({ 됐다: 1 });
    });
    await 붙인다(app);

    expect(await 러너에보낸다('/execute-scenario', { 가: [1, '나'] }, 5000)).toEqual({ status: 201, json: { 됐다: 1 } });
    expect(받은것.본문).toEqual({ 가: [1, '나'] });
  });

  it('제한 시간보다 늦게 오는 응답은 던진다 — 호출자가 「러너에 닿지 못했습니다」로 접는다', async () => {
    await 늦게띄운다(500);

    await expect(러너에보낸다('/execute', {}, 100)).rejects.toThrow();
  });

  it('응답 머리가 늦게 와도 제한 안이면 받는다', async () => {
    await 늦게띄운다(1000);

    expect(await 러너에보낸다('/execute', {}, 5000)).toEqual({ status: 200, json: { 늦었다: true } });
  });

  it('닫힌 포트면 던진다', async () => {
    process.env.RUNNER_URL = 'http://127.0.0.1:9';

    await expect(러너에보낸다('/execute', {}, 5000)).rejects.toThrow();
  });
});

describe('진행', () => {
  it('러너가 돌고 있다고 답한 절차를 그대로 돌려준다', async () => {
    await 진행띄운다(200, { items: [{ historyId: 42, seq: 2, title: '로그인한다', elapsedMs: 1200 }] });

    expect(await 진행()).toEqual([{ historyId: 42, seq: 2, title: '로그인한다', elapsedMs: 1200 }]);
  });

  it('러너가 200 이 아니면 빈 목록이다. 던지지 않는다', async () => {
    await 진행띄운다(503, { error: 'BUSY' });

    expect(await 진행()).toEqual([]);
  });

  it('러너에 아예 못 붙어도 빈 목록이다. 한 번 실패가 러너가 죽었다는 뜻은 아니다', async () => {
    process.env.RUNNER_URL = 'http://127.0.0.1:9';

    expect(await 진행()).toEqual([]);
  });

  describe('두 러너', () => {
    const 컨테이너절차 = { historyId: 1, seq: 1, title: '웹', elapsedMs: 10 };
    const 로컬절차 = { historyId: 2, seq: 1, title: '앱', elapsedMs: 20 };

    async function 진행띄우기(붙임: (app: FastifyInstance) => Promise<void>, code: number, body: unknown): Promise<void> {
      const app = Fastify();
      app.get('/progress', async (_req, reply) => reply.code(code).send(body));
      await 붙임(app);
    }

    it('LOCAL_RUNNER_URL 이 있으면 두 러너의 목록을 합친다', async () => {
      await 진행띄우기(붙인다, 200, { items: [컨테이너절차] });
      await 진행띄우기(로컬붙인다, 200, { items: [로컬절차] });

      expect(await 진행()).toEqual([컨테이너절차, 로컬절차]);
    });

    it('한쪽이 200 이 아니어도 다른 쪽 것은 낸다', async () => {
      await 진행띄우기(붙인다, 503, { error: 'BUSY' });
      await 진행띄우기(로컬붙인다, 200, { items: [로컬절차] });

      expect(await 진행()).toEqual([로컬절차]);
    });

    it('한쪽에 못 붙어도 다른 쪽 것은 낸다', async () => {
      process.env.RUNNER_URL = 'http://127.0.0.1:9';
      await 진행띄우기(로컬붙인다, 200, { items: [로컬절차] });

      expect(await 진행()).toEqual([로컬절차]);
    });

    it('LOCAL_RUNNER_URL 이 비면 컨테이너 한 곳에만 묻는다', async () => {
      await 진행띄우기(붙인다, 200, { items: [컨테이너절차] });

      expect(await 진행()).toEqual([컨테이너절차]);
    });

    it('두 주소가 같으면 한 번만 묻는다', async () => {
      await 진행띄우기(붙인다, 200, { items: [컨테이너절차] });
      process.env.LOCAL_RUNNER_URL = process.env.RUNNER_URL;

      expect(await 진행()).toEqual([컨테이너절차]);
    });
  });
});
