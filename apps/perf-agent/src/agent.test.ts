// 에이전트가 가짜 QA Hub 에서 일을 받아 가짜 k6 · /proc 로 돌리고 1초 숫자와 끝을 보내는지 본다 (도메인/성능 §5.4)

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { Agent } from './agent.js';
import type { Job } from './types.js';

// 가짜 k6 — 받은 인자 · 환경을 파일에 남기고 지금 시각의 k6 JSON 줄을 낸다. HOLD=1 이면 끊길 때까지 떠 있는다
const FAKE_K6 = `
import { readFileSync, writeFileSync } from 'node:fs';
const e = process.env;
const proto = e.QAHUB_FILES ? readFileSync(e.QAHUB_FILES + '/tx0.proto', 'utf8') : undefined;
writeFileSync(e.FAKE_ARGV, JSON.stringify({ argv: process.argv.slice(2), env: { BASE_URL: e.BASE_URL, ACCOUNTS_CSV: e.ACCOUNTS_CSV, AGENT_TOKEN: e.AGENT_TOKEN, K6_BROWSER_ARGS: e.K6_BROWSER_ARGS, PROTO: proto } }));
const p = (metric, value, tags) => console.log(JSON.stringify({ metric, type: 'Point', data: { time: new Date().toISOString(), value, tags } }));
p('vus', 5, {});
for (const ms of [10, 20, 30]) { p('http_req_duration', ms, { tx: 'login' }); p('http_req_failed', 0, { tx: 'login' }); }
p('checks', 0, { tx: 'login' });
if (e.PAGES === '1') {
  console.error('QAHUB_PAGE ' + JSON.stringify({ url: '/cart', lcpMs: 1200, fcpMs: 400, cls: 0.02, ttfbMs: 80, lcpElement: 'h1#title', resources: [] }));
  console.error('QAHUB_PAGE {');
  console.error('보통 오류 줄');
}
if (e.FAIL === '1') { console.error('스크립트 오류'); process.exit(107); }
setTimeout(() => {}, e.HOLD === '1' ? 60_000 : 300);
`;

interface Seen {
  argv: string[];
  env: Record<string, string | undefined>;
}

interface Call {
  path: string;
  auth: string | undefined;
  body: Record<string, unknown>;
}

let server: Server | undefined;
afterEach(() => server?.close());

async function runOnce(job: Partial<Job>, opts: { stop?: boolean; procRoot?: string; metrics204?: boolean } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'perf-agent-test-'));
  writeFileSync(join(dir, 'k6.mjs'), FAKE_K6);
  const fake = { FAKE_ARGV: join(dir, 'argv.json') };
  process.env.AGENT_TOKEN = 'pga_새면안됨';
  process.env.K6_BROWSER_ARGS = 'no-sandbox';
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
        const base: Job = { runId: 7, kind: 'LOAD', startAt: new Date().toISOString(), script: 'export default function () {}', env: { BASE_URL: 'http://shop.test' }, allowedHosts: ['shop.test'], durationSec: 2 };
        return json({ job: first ? { ...base, ...job, env: { ...(job.env ?? base.env), ...fake } } : null });
      }
      if (path.endsWith('/metrics')) return opts.metrics204 ? void res.writeHead(204).end() : json({ stop: opts.stop ?? false });
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
  const seen = (() => {
    try {
      return JSON.parse(readFileSync(argvFile, 'utf8')) as Seen;
    } catch {
      return null;
    }
  })();
  return { calls, argv: seen?.argv ?? null, env: seen?.env ?? null, done: calls.find((c) => c.path.endsWith('/done'))!.body, metrics: calls.filter((c) => c.path.endsWith('/metrics')).map((c) => c.body) };
}

describe('Agent', () => {
  it('연락 · 일 받기 뒤 k6 를 실행 구간 · 환경값과 함께 켜고 1초 숫자와 끝을 보낸다', async () => {
    const r = await runOnce({ segment: '0:1/2', segmentSequence: '0,1/2,1', env: { BASE_URL: 'http://shop.test:8080' }, allowedHosts: ['shop.test:8080'], accountsCsv: 'id,pw\na,b\n' });
    expect(r.calls[0]).toMatchObject({ path: '/api/perf/agent/hello', auth: 'Bearer pga_test', body: { version: '0.1.0', maxVus: 300 } });
    expect(r.calls[1].path).toBe('/api/perf/agent/claim');
    expect(r.argv).toEqual(expect.arrayContaining(['--execution-segment', '0:1/2', '--execution-segment-sequence', '0,1/2,1', '--system-tags=', 'json=-']));
    expect(r.argv!.join(' ')).not.toContain('BASE_URL');
    expect(r.env).toMatchObject({ BASE_URL: 'http://shop.test:8080', ACCOUNTS_CSV: expect.stringMatching(/accounts\.csv$/) });
    expect(r.env!.AGENT_TOKEN).toBeUndefined();
    expect(r.metrics[0]).toMatchObject({ sec: 0, vus: 5, txs: [{ name: 'login', requests: 3, errors: 1 }] });
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('일의 files 를 QAHUB_FILES 폴더에 풀어 k6 에 넘기고, 이름이 폴더 밖을 가리키면 k6 를 켜지 않는다', async () => {
    const r = await runOnce({ files: { 'tx0.proto': 'syntax = "proto3";' } });
    expect(r.env!.PROTO).toBe('syntax = "proto3";');
    expect(r.done).toEqual({ status: 'OK' });
    const bad = await runOnce({ files: { '../x.proto': 'a' } });
    expect(bad.argv).toBeNull();
    expect(bad.done).toEqual({ status: 'ERROR', reason: '일의 파일 이름이 틀렸습니다' });
  });

  it('QA Hub 가 멈추라고 답하면 k6 를 끊고 OK 로 끝낸다', async () => {
    const r = await runOnce({ env: { BASE_URL: 'http://shop.test', HOLD: '1' } }, { stop: true });
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('1초 숫자에 204 로 답해도 죽지 않고 끝까지 간다', async () => {
    const r = await runOnce({}, { metrics204: true });
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('k6 가 오류로 끝나면 끝 코드와 오류 줄을 이유로 보낸다', async () => {
    const r = await runOnce({ env: { BASE_URL: 'http://shop.test', FAIL: '1' } });
    expect(r.done.status).toBe('ERROR');
    expect(r.done.reason).toMatch(/107.*스크립트 오류/);
  });

  it('대상 서버가 허용 호스트 밖이면 k6 를 켜지 않는다', async () => {
    const r = await runOnce({ env: { BASE_URL: 'https://real-shop.example' }, allowedHosts: ['shop.test'] });
    expect(r.argv).toBeNull();
    expect(r.done).toEqual({ status: 'ERROR', reason: '허용 호스트 밖의 대상 서버입니다 — real-shop.example' });
  });

  it('대상 서버 주소가 없으면 검사를 건너뛰지 않고 막는다', async () => {
    const r = await runOnce({ env: {} });
    expect(r.argv).toBeNull();
    expect(r.done).toEqual({ status: 'ERROR', reason: '허용 호스트 밖의 대상 서버입니다 — 주소 없음' });
  });

  it('스크립트가 없는 일은 k6 를 켜지 않고 오류로 끝낸다', async () => {
    const r = await runOnce({ kind: 'PAGE', script: null });
    expect(r.argv).toBeNull();
    expect(r.done.status).toBe('ERROR');
  });

  it('페이지 측정 일은 k6 를 켜고 콘솔 표본 줄을 1초 숫자의 pages 로 보낸다', async () => {
    const r = await runOnce({ kind: 'PAGE', env: { BASE_URL: 'http://shop.test', PAGES: '1' } });
    expect(r.argv).toContain('--log-format=raw');
    expect(r.env).toMatchObject({ K6_BROWSER_ARGS: 'no-sandbox' });
    expect(r.env!.AGENT_TOKEN).toBeUndefined();
    const pages = r.metrics.flatMap((m) => (m.pages as unknown[] | undefined) ?? []);
    expect(pages).toEqual([{ url: '/cart', lcpMs: 1200, fcpMs: 400, cls: 0.02, ttfbMs: 80, lcpElement: 'h1#title', resources: [] }]);
    expect(r.done).toEqual({ status: 'OK' });
  });

  it('표본이 없으면 pages 칸을 달지 않는다', async () => {
    const r = await runOnce({ kind: 'PAGE' });
    expect(r.metrics.every((m) => !('pages' in m))).toBe(true);
  });

  it('표본 줄 · 깨진 줄은 오류 이유에 섞이지 않는다', async () => {
    const r = await runOnce({ kind: 'PAGE', env: { BASE_URL: 'http://shop.test', PAGES: '1', FAIL: '1' } });
    expect(r.done.reason).toContain('스크립트 오류');
    expect(r.done.reason).not.toContain('QAHUB_PAGE');
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

  it('모니터링 일을 시작 시각보다 늦게 받으면 지난 초는 건너뛴다', async () => {
    const proc = mkdtempSync(join(tmpdir(), 'perf-agent-proc-'));
    mkdirSync(join(proc, 'net'));
    writeFileSync(join(proc, 'stat'), 'cpu  100 0 50 800 50 0 0 0 0 0\n');
    writeFileSync(join(proc, 'meminfo'), 'MemTotal: 1000 kB\nMemAvailable: 250 kB\n');
    writeFileSync(join(proc, 'diskstats'), '   8       0 sda 10 0 30 0 5 0 70 0 0 0 0\n');
    writeFileSync(join(proc, 'net/dev'), 'h\nh\n  eth0: 2048 20 0 0 0 0 0 0 1024 10 0 0 0 0 0 0\n');
    const r = await runOnce({ kind: 'MONITOR', script: null, durationSec: 22, startAt: new Date(Date.now() - 20_000).toISOString() }, { procRoot: proc });
    const secs = r.metrics.map((m) => m.sec as number);
    expect(secs.length).toBeGreaterThan(0);
    expect(secs.length).toBeLessThanOrEqual(2);
    expect(secs.every((s) => s >= 20)).toBe(true);
    expect(r.done).toEqual({ status: 'OK' });
  });
});
