// 에이전트가 가짜 QA Hub 에서 일을 받아 가짜 k6 · /proc 로 돌리고 1초 숫자와 끝을 보내는지 본다 (도메인/성능 §5.4)

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { Agent } from './agent.js';
import type { Job } from './types.js';

// 가짜 k6 — 받은 인자를 파일에 남기고 지금 시각의 k6 JSON 줄을 낸다. HOLD=1 이면 끊길 때까지 떠 있는다
const FAKE_K6 = `
import { writeFileSync } from 'node:fs';
const argv = process.argv.slice(2);
writeFileSync(process.env.FAKE_ARGV, JSON.stringify(argv));
const p = (metric, value, tags) => console.log(JSON.stringify({ metric, type: 'Point', data: { time: new Date().toISOString(), value, tags } }));
p('vus', 5, {});
for (const ms of [10, 20, 30]) { p('http_req_duration', ms, { tx: 'login' }); p('http_req_failed', 0, { tx: 'login' }); }
p('checks', 0, { tx: 'login' });
if (argv.includes('FAIL=1')) { console.error('스크립트 오류'); process.exit(107); }
setTimeout(() => {}, argv.includes('HOLD=1') ? 60_000 : 300);
`;

interface Call {
  path: string;
  auth: string | undefined;
  body: Record<string, unknown>;
}

let server: Server | undefined;
afterEach(() => server?.close());

async function runOnce(job: Partial<Job>, opts: { stop?: boolean; procRoot?: string } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'perf-agent-test-'));
  writeFileSync(join(dir, 'k6.mjs'), FAKE_K6);
  process.env.FAKE_ARGV = join(dir, 'argv.json');
  const calls: Call[] = [];
  const ctrl = new AbortController();
  let claimed = false;
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const path = req.url ?? '';
      calls.push({ path, auth: req.headers.authorization, body: JSON.parse(raw || '{}') as Record<string, unknown> });
      const json = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      if (path.endsWith('/hello')) return json({ agentId: 1, name: 'perf-1', mode: 'LOAD', serverTime: new Date().toISOString() });
      if (path.endsWith('/claim')) {
        const first = !claimed;
        claimed = true;
        return json({ job: first ? { runId: 7, kind: 'LOAD', startAt: new Date().toISOString(), script: 'export default function () {}', env: {}, allowedHosts: [], durationSec: 2, ...job } : null });
      }
      if (path.endsWith('/metrics')) return json({ stop: opts.stop ?? false });
      res.writeHead(204).end();
      if (path.endsWith('/done')) ctrl.abort();
    });
  });
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  const agent = new Agent({
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    token: 'pga_test',
    version: '0.1.0',
    maxVus: 300,
    k6: [process.execPath, join(dir, 'k6.mjs')],
    procRoot: opts.procRoot ?? '/proc',
    workDir: dir,
    log: () => undefined,
    signal: ctrl.signal,
  });
  await agent.run();
  const argvFile = join(dir, 'argv.json');
  const argv = (() => {
    try {
      return JSON.parse(readFileSync(argvFile, 'utf8')) as string[];
    } catch {
      return null;
    }
  })();
  return { calls, argv, done: calls.find((c) => c.path.endsWith('/done'))!.body, metrics: calls.filter((c) => c.path.endsWith('/metrics')).map((c) => c.body) };
}

describe('Agent', () => {
  it('연락 · 일 받기 뒤 k6 를 실행 구간 · 환경값과 함께 켜고 1초 숫자와 끝을 보낸다', async () => {
    const r = await runOnce({ segment: '0:1/2', segmentSequence: '0,1/2,1', env: { BASE_URL: 'http://shop.test:8080' }, allowedHosts: ['shop.test:8080'], accountsCsv: 'id,pw\na,b\n' });
    expect(r.calls[0]).toMatchObject({ path: '/api/perf/agent/hello', auth: 'Bearer pga_test', body: { version: '0.1.0', maxVus: 300 } });
    expect(r.calls[1].path).toBe('/api/perf/agent/claim');
    expect(r.argv).toEqual(expect.arrayContaining(['--execution-segment', '0:1/2', '--execution-segment-sequence', '0,1/2,1', 'BASE_URL=http://shop.test:8080', '--system-tags=', 'json=-']));
    expect(r.argv!.find((a) => a.startsWith('ACCOUNTS_CSV='))).toMatch(/accounts\.csv$/);
    expect(r.metrics[0]).toMatchObject({ sec: 0, vus: 5, txs: [{ name: 'login', requests: 3, errors: 1 }] });
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('QA Hub 가 멈추라고 답하면 k6 를 끊고 OK 로 끝낸다', async () => {
    const r = await runOnce({ env: { HOLD: '1' } }, { stop: true });
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('k6 가 오류로 끝나면 끝 코드와 오류 줄을 이유로 보낸다', async () => {
    const r = await runOnce({ env: { FAIL: '1' } });
    expect(r.done.status).toBe('ERROR');
    expect(r.done.reason).toMatch(/107.*스크립트 오류/);
  });

  it('대상 서버가 허용 호스트 밖이면 k6 를 켜지 않는다', async () => {
    const r = await runOnce({ env: { BASE_URL: 'https://real-shop.example' }, allowedHosts: ['shop.test'] });
    expect(r.argv).toBeNull();
    expect(r.done).toEqual({ status: 'ERROR', reason: '허용 호스트 밖의 대상 서버입니다 — real-shop.example' });
  });

  it('아직 못 하는 일(페이지 측정)은 오류로 끝낸다', async () => {
    const r = await runOnce({ kind: 'PAGE', script: null });
    expect(r.argv).toBeNull();
    expect(r.done.status).toBe('ERROR');
  });

  it('모니터링 일은 /proc 를 1초마다 읽어 보낸다', async () => {
    const proc = mkdtempSync(join(tmpdir(), 'perf-agent-proc-'));
    mkdirSync(join(proc, 'net'));
    writeFileSync(join(proc, 'stat'), 'cpu  100 0 50 800 50 0 0 0 0 0\n');
    writeFileSync(join(proc, 'meminfo'), 'MemTotal: 1000 kB\nMemAvailable: 250 kB\n');
    writeFileSync(join(proc, 'diskstats'), '   8       0 sda 10 0 30 0 5 0 70 0 0 0 0\n');
    writeFileSync(join(proc, 'net/dev'), 'h\nh\n  eth0: 2048 20 0 0 0 0 0 0 1024 10 0 0 0 0 0 0\n');
    const r = await runOnce({ kind: 'MONITOR', script: null, durationSec: 2 }, { procRoot: proc });
    expect(r.metrics).toEqual([
      { sec: 0, cpu: 0, mem: 75, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 },
      { sec: 1, cpu: 0, mem: 75, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 },
    ]);
    expect(r.done).toEqual({ status: 'OK' });
  });
});
