// 기기 성능 DB 검사가 같이 쓰는 차림 — 가짜 팜 · 가짜 서버 러너 · 가짜 내 컴퓨터 러너(로컬 http 서버)와 실행 만들기 · 기다리기 (검사 전용, 제품 코드가 아니다)

import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { z } from 'zod';

import { 차리기, type 차림 } from './dbFixture.js';
import { type 측정본문, 측정세우기 } from './devices.js';
import { 설정 } from './deviceRun.js';
import { 한번돌기 } from './engine.js';
import { 뒷일기다리기 } from './finish.js';

export const 쉼 = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface 호출 { method: string; path: string; body: Record<string, unknown> }
export interface 가짜 { url: string; 호출들: 호출[]; close: () => Promise<void> }

async function 서버(핸들: (호출: 호출, 응답: (status: number, 몸: unknown) => void, 원본: http.ServerResponse) => void | Promise<void>): Promise<가짜> {
  const 호출들: 호출[] = [];
  const s = http.createServer((req, res) => {
    const 조각: Buffer[] = [];
    req.on('data', (c: Buffer) => 조각.push(c));
    req.on('end', () => {
      const 글 = Buffer.concat(조각).toString('utf8');
      const h: 호출 = { method: req.method ?? '', path: req.url ?? '', body: 글 === '' ? {} : (JSON.parse(글) as Record<string, unknown>) };
      호출들.push(h);
      const 응답 = (status: number, 몸: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(몸));
      void Promise.resolve(핸들(h, 응답, res)).catch(() => 응답(500, { error: 'x' }));
    });
  });
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as { port: number };
  return { url: `http://127.0.0.1:${port}`, 호출들, close: () => new Promise<void>((r) => { s.closeAllConnections(); s.close(() => r()); }) };
}

export function 환경쓰기(값: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(값)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

export async function 환경로(값: Record<string, string | undefined>, 일: () => Promise<void>): Promise<void> {
  const 옛 = Object.fromEntries(Object.keys(값).map((k) => [k, process.env[k]]));
  환경쓰기(값);
  try {
    await 일();
  } finally {
    환경쓰기(옛);
  }
}

export interface 실행끝 {
  status: string;
  verdict: string | null;
  stop_reason: string | null;
  targets: { scope: string; metric: string; measured: number | null; verdict: string }[] | null;
  config: { devices: { launchMs: number | null }[] };
}

export interface 결과꼴 {
  devices: { serial: string; model: string; where: string; launchMs: number | null; summary: Record<string, number | null>; verdict: string | null }[];
  metrics: { serial: string; sec: number; loop: number | null; segment: string | null; fps: number }[];
  segments: { serial: string; loop: number; segment: string }[];
  loops: { serial: string; loop: number; maxMemMb: number }[];
  leak: unknown[];
  videos: { serial: string; name: string; startSec: number }[];
  markers: unknown[];
}

/** 접두사 하나가 곧 이 검사의 이름이다. 케이스는 `<접두사>-001`(android) · `-002`(desktop). api 를 주면 API 애플리케이션 `<접두사>B` 와 그 케이스 `<접두사>B-001` 도 만든다 */
export async function 기기차림(접두사: string, api: boolean) {
  const 임시 = await mkdtemp(join(tmpdir(), `${접두사.toLowerCase()}-`));
  const 팜시작 = new Map<string, number>();
  const 줄끔 = new Set<string>();
  // 바꿔 가며 쓰는 값 — 검사가 직접 고친다
  const 상태 = { fps값: 58, 러너지연: 0 };
  const 로컬시작 = { at: 0 };

  const 줄들 = (시작: number, since: number, serial: string) => {
    if (줄끔.has(serial)) return [];
    const 지금 = Math.floor((Date.now() - 시작) / 1000);
    return Array.from({ length: Math.max(0, 지금 - since) }, (_, i) => since + 1 + i).map((sec) => ({ sec, fps: 상태.fps값, jankPct: 1, cpu: 20, memMb: 500 + sec * 10, tempC: 38, batteryPct: 80 }));
  };

  const 팜 = await 서버((h, 응답, 원본) => {
    const m = /^\/api\/devices\/([^/?]+)(\/.*)?$/.exec(h.path);
    if (h.path === '/api/devices') {
      return 응답(200, { value: { devices: [
        { serial: 'FA1', state: 'IDLE', model: 'SM-A236', osVersion: '13', resolution: '1080x2408' },
        { serial: 'FA2', state: 'IDLE', model: 'Pixel 6', osVersion: '14', resolution: '1080x2400' },
        { serial: 'FB1', state: 'BUSY', model: 'Galaxy S9', osVersion: '10', resolution: '1440x2960' },
      ] } });
    }
    const serial = decodeURIComponent(m?.[1] ?? '');
    const 뒤 = m?.[2] ?? '';
    if (h.method === 'POST' && 뒤 === '/hold') {
      팜시작.set(serial, Date.now());
      return 응답(200, { held: { until: Date.now() + 30 * 60_000, now: Date.now() } });
    }
    if (h.method === 'DELETE' && 뒤 === '/hold') return 응답(200, {});
    if (뒤.startsWith('/perf?')) {
      const since = Number(new URL(h.path, 'http://x').searchParams.get('since'));
      return 응답(200, { rows: 줄들(팜시작.get(serial) ?? Date.now(), since, serial), launchMs: 줄끔.has(serial) ? null : 2300 });
    }
    if (뒤 === '/perf/files') return 응답(200, { files: [{ name: 'rec-0.mp4', bytes: 8 }, { name: '../evil.mp4', bytes: 1 }, { name: 'perf-metrics.jsonl', bytes: 5 }] });
    if (뒤 === '/perf/files/rec-0.mp4') return void 원본.writeHead(200, { 'content-type': 'video/mp4' }).end(Buffer.from('FAKEMP4!'));
    return 응답(404, { error: 'x' });
  });
  const 러너 = await 서버(async (h, 응답) => {
    if (h.path === '/abort') return 응답(200, { aborted: true });
    if (h.path === '/health') return 응답(200, { ok: true });
    if (h.method === 'GET') return 응답(404, { error: 'NOT_FOUND' });
    await 쉼(상태.러너지연);
    응답(200, { historyId: (h.body as { historyId: number }).historyId, status: 'PASS', durationMs: 2000, steps: [
      { seq: 1, title: '로그인', status: 'PASS', durationMs: 1000, assertions: [] },
      { seq: 2, title: '목록', status: 'PASS', durationMs: 1000, assertions: [] },
    ] });
  });
  const 로컬 = await 서버((h, 응답) => {
    if (h.path === '/perf/devices') return 응답(200, { devices: [{ serial: 'LC1', model: 'Pixel 7', os: '14' }] });
    if (h.path === '/perf/device/start') {
      로컬시작.at = Date.now();
      return 응답(201, { recId: 'lrec' });
    }
    if (h.path === '/perf/device/lrec/stop') return 응답(200, { files: [] });
    if (h.path.startsWith('/perf/device/lrec?')) {
      const since = Number(new URL(h.path, 'http://x').searchParams.get('since'));
      return 응답(200, { rows: 줄들(로컬시작.at, since, 'LC1'), launchMs: 1800 });
    }
    return 응답(404, { error: 'x' });
  });
  const 목표환경 = { PLATFORM_ARTIFACTS_DIR: 임시, DEVICE_FARM_URL: 팜.url, RUNNER_URL: 러너.url, LOCAL_RUNNER_URL: 로컬.url };
  const 옛환경 = Object.fromEntries(Object.keys(목표환경).map((k) => [k, process.env[k]]));
  환경쓰기(목표환경);
  설정.틱ms = 50;
  설정.무소식ms = 2500;
  설정.정리대기ms = 3000;

  const 판: 차림 = await 차리기(접두사);
  await 판.pool.query(`UPDATE service_env SET app_path = '/apps/demo.apk' WHERE service_id = $1 AND env = 'qa'`, [판.서비스]);
  await 판.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'dev', 'http://dev.${접두사.toLowerCase()}.test')`, [판.서비스]);
  const 케이스들: [string, string][] = [[`${접두사}-001`, '["android"]'], [`${접두사}-002`, '["desktop"]']];
  let API앱 = 0;
  if (api) {
    const s = await 판.pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ($1, $1, '#445566', '', $1, $2, 'API') RETURNING id`,
      [`${접두사}B`, 판.프로젝트],
    );
    API앱 = Number(s.rows[0]?.id);
    await 판.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://api.${접두사.toLowerCase()}.test')`, [API앱]);
    케이스들.push([`${접두사}B-001`, '["android"]']);
  }
  for (const [tcId, platforms] of 케이스들) {
    await 판.pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, $1, $2, '[]', 'x/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
      [tcId, platforms],
    );
  }

  const 본문 = (more: object = {}): z.infer<typeof 측정본문> => ({
    serviceId: 판.서비스, env: 'qa', drive: 'MANUAL', durationSec: 60, build: { package: 'com.demo.market' },
    devices: [{ serial: 'FA1', where: 'FARM' }], repeat: 1, targets: [], metrics: ['FPS', 'MEM'], intervalSec: 1, record: true, ...more,
  }) as z.infer<typeof 측정본문>;

  return {
    판, 팜, 러너, 로컬, 임시, 줄끔, 상태, 케이스들: 케이스들.map(([id]) => id), API앱,
    측정: (more: object = {}, cookie = 판.쓰기) => 판.사람(cookie, 'POST', '/api/perf/devices/measure', 본문(more)),
    /** 검사용 실행 — 측정 시간만 줄인다. 만들기 통로는 엔진을 깨우니 표에 직접 넣는다 */
    async 만들기(more: object, 초: number): Promise<number> {
      const r = await 측정세우기(본문(more), { username: 'xqd', name: 'xqd' });
      if ('error' in r) throw new Error(JSON.stringify(r));
      await 판.pool.query(`UPDATE perf_run SET config = jsonb_set(config, '{durationSec}', to_jsonb($2::int)) WHERE id = $1`, [r.runId, 초]);
      return r.runId;
    },
    async 끝날때까지(runId: number): Promise<실행끝> {
      for (let i = 0; i < 400; i++) {
        await 한번돌기();
        const r = (await 판.pool.query<실행끝>('SELECT status, verdict, stop_reason, targets, config FROM perf_run WHERE id = $1', [runId])).rows[0]!;
        if (['DONE', 'STOPPED', 'ERROR'].includes(r.status)) {
          await 뒷일기다리기();
          return r;
        }
        await 쉼(50);
      }
      throw new Error('실행이 끝나지 않았다');
    },
    결과: async (runId: number, 쿼리 = '') => (await 판.사람(판.읽기만, 'GET', `/api/perf/runs/${runId}/devices${쿼리}`)).json<결과꼴>(),
    홀드삭제수: (serial: string) => 팜.호출들.filter((h) => h.method === 'DELETE' && h.path === `/api/devices/${serial}/hold`).length,
    async 정리() {
      await 뒷일기다리기();
      if (API앱 !== 0) {
        await 판.pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [API앱]);
        await 판.pool.query('DELETE FROM perf_run WHERE service_id = $1', [API앱]);
        await 판.pool.query('DELETE FROM service_env WHERE service_id = $1', [API앱]);
      }
      await 판.pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들.map(([id]) => id)]);
      await 판.정리();
      if (API앱 !== 0) await 판.pool.query('DELETE FROM service WHERE id = $1', [API앱]);
      환경쓰기(옛환경);
      await Promise.all([팜.close(), 러너.close(), 로컬.close()]);
      await rm(임시, { recursive: true, force: true });
    },
  };
}

export type 기기차림타입 = Awaited<ReturnType<typeof 기기차림>>;
