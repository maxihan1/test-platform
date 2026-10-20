// 두 러너(컨테이너 · 로컬) 중 어디로 보내고 끊고 진행을 묻는지, 앱 항목이 팜 폰을 잡고 놓는지 본다 (SPEC 실행 §3.2).
// 진짜 러너 · 팜 대신 같은 계약을 흉내내는 서버를 띄운다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import type { ExecuteRequest } from '@platform/kit';

import { abortRunner, callRunner, 진행 } from './runner.js';
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

  async function 팜띄운다(불렸다: string[]): Promise<void> {
    const app = Fastify();
    app.get('/wd/hub/api/devices', async () => ({ value: { devices: [{ serial: 'R3CR10TCVCD' }] } }));
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
    expect(res.error?.message).toBe('이 서버에는 디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
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
