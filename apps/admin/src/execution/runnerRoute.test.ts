// 두 러너(컨테이너 · 로컬) 중 어디로 보내고 끊고 진행을 묻는지, 앱 항목이 팜 폰을 잡고 놓는지 본다 (SPEC 실행 §3.2).
// 진짜 러너 · 팜 대신 같은 계약을 흉내내는 서버를 띄운다

import { createServer } from 'node:net';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ExecuteRequest } from '@platform/kit';

import { 실행팜토큰 } from './farmToken.js';
import { abortRunner, callRunner, 진행 } from './runner.js';
import type { PendingItem } from './store.js';

// 화면 애플리케이션 케이스로 둔다 — 판 읽기는 runner.test.ts 가 본다
vi.mock('../apidoc/caseDoc.js', () => ({ 케이스판: vi.fn(async () => ({})) }));
vi.mock('./farmToken.js', () => ({ 실행팜토큰: vi.fn(async () => undefined) }));

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
let 가짜팜: FastifyInstance | null = null;

async function 붙인다(app: FastifyInstance): Promise<void> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
  가짜러너 = app;
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
  await 가짜팜?.close();
  가짜팜 = null;
  delete process.env.RUNNER_URL;
  delete process.env.LOCAL_RUNNER_URL;
  delete process.env.DEVICE_FARM_URL;
  delete process.env.RUNNER_TOKEN;
});

describe('callRunner — 어느 러너로 가는가', () => {
  async function 이름띄운다(붙임: (app: FastifyInstance) => Promise<void>, 불렸다: string[], 이름: string, 받은요청: ExecuteRequest[] = []): Promise<void> {
    const app = Fastify();
    app.post('/execute', async (req) => {
      불렸다.push(이름);
      받은요청.push(req.body as ExecuteRequest);
      return { historyId: (req.body as ExecuteRequest).historyId, status: 'PASS', durationMs: 1, steps: [] };
    });
    await 붙임(app);
  }

  async function 팜띄운다(불렸다: string[], 받은머리: (string | undefined)[] = []): Promise<void> {
    const app = Fastify();
    app.addHook('onRequest', async (req) => {
      받은머리.push(req.headers.authorization);
    });
    app.get('/wd/hub/api/devices', async () => ({ value: { devices: [{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }] } }));
    app.post('/wd/hub/api/devices/:serial/hold', async () => {
      불렸다.push('잡기');
      return { held: {} };
    });
    app.delete('/wd/hub/api/devices/:serial/hold', async () => {
      불렸다.push('놓기');
      return { released: true };
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    process.env.DEVICE_FARM_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}/wd/hub`;
    가짜팜 = app;
  }

  it('android 항목은 팜에서 폰을 잡고 서버 러너(RUNNER_URL)에 그 번호를 실어 보낸 뒤 놓는다 — 로컬 러너는 안 부른다', async () => {
    const 불렸다: string[] = [];
    const 받은요청: ExecuteRequest[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버', 받은요청);
    await 이름띄운다(로컬붙인다, 불렸다, '로컬');
    await 팜띄운다(불렸다);

    const res = await callRunner(7, { ...항목, platform: 'android' });
    expect(res.status).toBe('PASS');
    expect(불렸다).toEqual(['잡기', '서버', '놓기']);
    expect(받은요청[0]?.udid).toBe('R3CR10TCVCD');
  });

  it('누른 사람 토큰이 있으면 팜에 그 토큰으로 잡고 놓고, 러너 요청에도 farmToken 으로 싣는다', async () => {
    vi.mocked(실행팜토큰).mockResolvedValueOnce('pat_kim');
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_server');
    const 불렸다: string[] = [];
    const 받은요청: ExecuteRequest[] = [];
    const 받은머리: (string | undefined)[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버', 받은요청);
    await 팜띄운다(불렸다, 받은머리);

    await callRunner(7, { ...항목, platform: 'android' });
    vi.unstubAllEnvs();
    expect(실행팜토큰).toHaveBeenCalledWith(7);
    expect(불렸다).toEqual(['잡기', '서버', '놓기']);
    expect(new Set(받은머리)).toEqual(new Set(['Bearer pat_kim']));
    expect(받은요청[0]?.farmToken).toBe('pat_kim');
  });

  it('누른 사람 토큰이 없으면 서버 몫으로 잡고 러너 요청에 farmToken 을 싣지 않는다', async () => {
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_server');
    const 불렸다: string[] = [];
    const 받은요청: ExecuteRequest[] = [];
    const 받은머리: (string | undefined)[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버', 받은요청);
    await 팜띄운다(불렸다, 받은머리);

    await callRunner(7, { ...항목, platform: 'android' });
    vi.unstubAllEnvs();
    expect(new Set(받은머리)).toEqual(new Set(['Bearer pat_server']));
    expect(받은요청[0]).not.toHaveProperty('farmToken');
  });

  it('폰을 잡는 사이에 실행이 멈췄으면 러너에 보내지 않고 폰을 놓는다', async () => {
    const 불렸다: string[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버');
    await 팜띄운다(불렸다);

    const res = await callRunner(7, { ...항목, platform: 'android' }, () => true);
    expect(불렸다).toEqual(['잡기', '놓기']);
    expect(res.status).toBe('NA');
  });

  it('브라우저 항목은 폰 번호를 싣지 않고 팜을 부르지 않는다', async () => {
    const 불렸다: string[] = [];
    const 받은요청: ExecuteRequest[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버', 받은요청);
    await 팜띄운다(불렸다);

    await callRunner(7, 항목);
    expect(불렸다).toEqual(['서버']);
    expect(받은요청[0]).not.toHaveProperty('udid');
  });

  it('android 인데 DEVICE_FARM_URL 이 비면 러너를 부르지 않고 NA 로 접는다', async () => {
    const 불렸다: string[] = [];
    await 이름띄운다(붙인다, 불렸다, '서버');

    const res = await callRunner(7, { ...항목, platform: 'android' });
    expect(불렸다).toEqual([]);
    expect(res.status).toBe('NA');
    expect(res.historyId).toBe(42);
    expect(res.error?.message).toBe('이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  });
});

describe('abortRunner', () => {
  it('정식 실행의 중단은 앱 항목도 서버 러너에 보낸다', async () => {
    const 받은것: number[] = [];
    const 로컬: number[] = [];
    for (const [붙임, 목록] of [[붙인다, 받은것], [로컬붙인다, 로컬]] as const) {
      const app = Fastify();
      app.post('/abort', async (req) => {
        목록.push((req.body as { historyId: number }).historyId);
        return { aborted: true };
      });
      await 붙임(app);
    }

    expect(await abortRunner(1)).toBe(true);
    expect({ 받은것, 로컬 }).toEqual({ 받은것: [1], 로컬: [] });
  });
});

describe('진행 — 두 러너', () => {
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

describe('RUNNER_TOKEN · 잠든 러너', () => {
  it('토큰을 걸면 실행 · 중단 · 진행 모두에 실어 보낸다', async () => {
    process.env.RUNNER_TOKEN = 't0ken';
    const 머리: string[] = [];
    const app = Fastify();
    app.addHook('onRequest', async (req) => {
      머리.push(`${req.method} ${req.url} ${req.headers.authorization ?? '없음'}`);
    });
    app.post('/execute', async (req) => ({ historyId: (req.body as ExecuteRequest).historyId, status: 'PASS', durationMs: 1, steps: [] }));
    app.post('/abort', async () => ({ aborted: true }));
    app.get('/progress', async () => ({ items: [] }));
    await 붙인다(app);

    await callRunner(7, 항목);
    await abortRunner(1);
    await 진행();
    expect(머리.filter((줄) => !줄.startsWith('GET /health'))).toEqual(['POST /execute Bearer t0ken', 'POST /abort Bearer t0ken', 'GET /progress Bearer t0ken']);
  });

  it('연결만 받고 답이 없는 러너(잠든 맥의 터널 끝)면 제한 시간까지 매달리지 않고 2초 남짓에 NA 로 접는다', async () => {
    const 먹통 = createServer(() => {});
    await new Promise<void>((r) => 먹통.listen(0, '127.0.0.1', r));
    const addr = 먹통.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    const 시작 = Date.now();
    try {
      const res = await callRunner(7, { ...항목, timeoutMs: 60_000 });
      expect(res.status).toBe('NA');
      expect(res.error?.message).toBe('러너에 닿지 못했습니다');
      expect(res.error?.stack).toContain('/health');
      expect(Date.now() - 시작).toBeLessThan(5_000);
    } finally {
      먹통.close();
    }
  }, 10_000);
});
