// 에이전트가 가짜 QA Hub 에서 더미 클라이언트 zip 을 받아 풀고 띄워, 결과 줄을 1초 숫자로 묶어 보내고 끝을 알리는지 본다 (도메인/성능 §5.4)

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { Agent } from './agent.js';
import type { Job } from './types.js';

// 가짜 더미 클라이언트 — 모드에 따라 결과 줄을 쓰고 끝난다. 환경값을 결과 줄의 tx 이름에 실어 에이전트 쪽에서 볼 수 있게 한다
const CLIENT = `
import { readFileSync } from 'node:fs';
const e = process.env;
const line = (tx, ms, ok) => console.log(JSON.stringify({ t: Date.now(), tx, ms, ok }));
line('login', 10, true);
line('login', 20, false);
if (e.MODE === 'env') {
  line('users=' + e.QAHUB_USERS + ' host=' + e.QAHUB_HOST + ':' + e.QAHUB_PORT, 5, true);
  line('token=' + e.AGENT_TOKEN, 5, true);
  line('csv=' + readFileSync(e.QAHUB_ACCOUNTS_CSV, 'utf8').trim(), 5, true);
}
if (e.MODE === 'noise') {
  console.log('그냥 로그 줄');
  console.log('{"t": 깨진');
  console.log(JSON.stringify({ t: Date.now(), tx: 'bad', ms: 'x', ok: true }));
}
if (e.MODE === 'fail') { console.error('첫 오류'); console.error('boom'); process.exit(3); }
if (e.MODE === 'hold') setTimeout(() => {}, 60_000);
`;

interface Call {
  path: string;
  auth: string | undefined;
  body: Record<string, unknown>;
}

let server: Server | undefined;
afterEach(() => server?.close());

async function runOnce(job: Partial<Job>, opts: { mode?: string; stop?: boolean; abortAfterMs?: number } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'perf-dummy-test-'));
  writeFileSync(join(dir, 'client.mjs'), CLIENT);
  const zip = join(dir, 'client.zip');
  execFileSync('zip', ['-q', zip, 'client.mjs'], { cwd: dir });
  const zipBytes = readFileSync(zip);
  process.env.AGENT_TOKEN = 'pga_새면안됨';
  const calls: Call[] = [];
  const ctrl = new AbortController();
  let claimed = false;
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const path = req.url ?? '';
      calls.push({ path, auth: req.headers.authorization, body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {} });
      const json = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      if (path.endsWith('/hello')) return json({ agentId: 1, name: 'perf-1', mode: 'LOAD', serverTime: new Date().toISOString() });
      if (path.includes('/dummy-clients/')) return void res.writeHead(200, { 'content-type': 'application/zip' }).end(zipBytes);
      if (path.endsWith('/claim')) {
        const first = !claimed;
        claimed = true;
        const base: Job = {
          runId: 9, kind: 'LOAD', startAt: new Date().toISOString(), script: null, allowedHosts: ['game.test:7000'], durationSec: 2,
          env: { BASE_URL: 'http://game.test:7000', QAHUB_HOST: 'game.test', QAHUB_PORT: '7000', QAHUB_USERS: '4', QAHUB_STAGES: '[{"durationSec":2,"target":4}]', MODE: opts.mode ?? 'ok' },
          dummyClient: { id: 5, command: `${JSON.stringify(process.execPath)} client.mjs`, users: 4 },
        };
        return json({ job: first ? { ...base, ...job } : null });
      }
      if (path.endsWith('/metrics')) return json({ stop: opts.stop ?? false });
      res.writeHead(204).end();
      if (path.endsWith('/done')) ctrl.abort();
    });
  });
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  if (opts.abortAfterMs !== undefined) setTimeout(() => ctrl.abort(), opts.abortAfterMs);
  const agent = new Agent({
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, token: 'pga_test', version: '0.1.0', k6: ['k6-없음'], procRoot: '/proc', workDir: dir, log: () => undefined, signal: ctrl.signal,
  });
  await agent.run();
  const metrics = calls.filter((c) => c.path.endsWith('/metrics')).map((c) => c.body as { sec: number; vus: number; txs: { name: string; requests: number; errors: number }[] });
  const done = calls.find((c) => c.path.endsWith('/done'))?.body;
  const sum = (name: string) => metrics.flatMap((m) => m.txs).filter((t) => t.name === name).reduce((a, t) => ({ requests: a.requests + t.requests, errors: a.errors + t.errors }), { requests: 0, errors: 0 });
  return { calls, metrics, done, sum };
}

describe('Agent 더미 클라이언트', { timeout: 30_000 }, () => {
  it('zip 을 받아 풀어 띄우고 결과 줄을 1초 숫자로 묶어 보낸다 — vus 는 줄이 없는 초까지 계획값이다', async () => {
    const r = await runOnce({}, { mode: 'hold' });
    expect(r.calls.find((c) => c.path.includes('/dummy-clients/'))).toMatchObject({ path: '/api/perf/agent/dummy-clients/5', auth: 'Bearer pga_test' });
    expect(r.sum('login')).toEqual({ requests: 2, errors: 1 });
    expect(r.metrics[0]).toMatchObject({ sec: 0, vus: 2 });
    expect(r.metrics[1]).toMatchObject({ sec: 1, vus: 4, txs: [] });
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('클라이언트가 실행 시간 전에 0 으로 끝나면 OK 다', async () => {
    const r = await runOnce({ durationSec: 30 });
    expect(r.sum('login')).toEqual({ requests: 2, errors: 1 });
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('환경값만 물려준다 — 대상 · 사용자 수 · 계정 CSV 경로는 있고 AGENT_TOKEN 은 없다', async () => {
    const r = await runOnce({ accountsCsv: 'id,pw\na,b\n' }, { mode: 'env' });
    expect(r.sum('users=4 host=game.test:7000').requests).toBe(1);
    expect(r.sum('token=undefined').requests).toBe(1);
    expect(r.sum('csv=id,pw\na,b').requests).toBe(1);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('깨진 줄 · 꼴이 틀린 줄은 버리고 던지지 않는다', async () => {
    const r = await runOnce({}, { mode: 'noise' });
    expect(r.sum('bad').requests).toBe(0);
    expect(r.sum('login').requests).toBe(2);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('실행 시간 전에 0 이 아닌 코드로 끝나면 끝 코드와 오류 줄을 이유로 보낸다', async () => {
    const r = await runOnce({}, { mode: 'fail' });
    expect(r.done?.status).toBe('ERROR');
    expect(r.done?.reason).toMatch(/3 로 끝났습니다.*첫 오류.*boom/);
  });

  it('끝나지 않는 클라이언트는 실행 시간이 다 되면 우리가 끊고 OK 다', async () => {
    const t0 = Date.now();
    const r = await runOnce({}, { mode: 'hold' });
    expect(Date.now() - t0).toBeLessThan(15_000);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('QA Hub 가 멈추라고 답하면 끊고 OK 로 끝낸다', async () => {
    const r = await runOnce({ durationSec: 30, env: { BASE_URL: 'http://game.test:7000', QAHUB_STAGES: '[{"durationSec":30,"target":4}]', MODE: 'hold' } }, { stop: true });
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('에이전트가 꺼지면 클라이언트를 끊고 ERROR 다', async () => {
    const r = await runOnce({ durationSec: 30 }, { mode: 'hold', abortAfterMs: 1500 });
    expect(r.done).toEqual({ status: 'ERROR', reason: '에이전트가 꺼졌습니다' });
  });

  it('몫이 0 이면 받지도 띄우지도 않고 실행 시간 동안 빈 1초 숫자만 보낸다', async () => {
    const r = await runOnce({ dummyClient: { id: 5, command: 'exit 9', users: 0 }, env: { BASE_URL: 'http://game.test:7000', QAHUB_STAGES: '[{"durationSec":2,"target":0}]' } });
    expect(r.calls.some((c) => c.path.includes('/dummy-clients/'))).toBe(false);
    expect(r.metrics.length).toBeGreaterThanOrEqual(2);
    expect(r.metrics.every((m) => m.vus === 0 && m.txs.length === 0)).toBe(true);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('대상 서버가 허용 호스트 밖이면 받지도 띄우지도 않는다', async () => {
    const r = await runOnce({ env: { BASE_URL: 'https://real.example' } });
    expect(r.calls.some((c) => c.path.includes('/dummy-clients/'))).toBe(false);
    expect(r.done).toEqual({ status: 'ERROR', reason: '허용 호스트 밖의 대상 서버입니다 — real.example' });
  });
});
