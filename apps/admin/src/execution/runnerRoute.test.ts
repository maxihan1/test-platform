// 두 러너(컨테이너 · 로컬) 중 어디로 보내고 끊고 진행을 묻는지 본다 (SPEC 실행 §3.2).
// 진짜 러너 대신 같은 계약을 흉내내는 서버 둘을 띄운다

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
  delete process.env.RUNNER_URL;
  delete process.env.LOCAL_RUNNER_URL;
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
