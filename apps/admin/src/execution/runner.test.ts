// 러너 호출이 SPEC §5.2 계약대로 나가고, 러너가 죽거나 거절해도 그 항목만 NA로 접히는지 본다.
// 진짜 러너 대신 같은 계약을 흉내내는 서버를 띄운다 — 컨테이너 없이도 돌아야 하는 검사다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import type { ExecuteRequest } from '@platform/kit';

import { callRunner, httpTimeoutMs } from './runner.js';
import type { PendingItem } from './store.js';

const 항목: PendingItem = {
  historyId: 42,
  tcId: 'DEMO-001',
  platform: 'desktop',
  filePath: 'demo/DEMO-001.spec.ts',
  params: { 아이디: 'tester' },
  expected: { 결과: true },
  timeoutMs: 5000,
};

let 가짜러너: FastifyInstance | null = null;

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
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
  가짜러너 = app;
}

afterEach(async () => {
  await 가짜러너?.close();
  가짜러너 = null;
  delete process.env.RUNNER_URL;
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
      baseUrl: '',
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
    expect(res.error?.message).toContain('러너');
  });
});
