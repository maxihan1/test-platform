// 대시보드 프로젝트 요약(project)의 재료를 읽는다 — 판 · 지도 ① · 케이스 · 마지막 결과 · 시나리오 · 성능 실행 (도메인/리포팅 §8.12 「프로젝트 요약」)

import type { Platform } from '@platform/kit/types';

import { lastByCase } from '../execution/history.js';
import { 기기요약하기 } from '../perf/deviceStats.js';
import { 줄읽기 as 기기줄읽기 } from '../perf/deviceStore.js';
import { percentile } from '../perf/hist.js';
import type { DeviceRunConfig } from '../perf/types.js';
import { 지금판, 케이스지도 } from '../prd/store.js';
import { 목록 as 시나리오목록 } from '../scenario/store.js';
import { E2E셈, PRD셈, 케이스셈, 솎기, type E2E요약, type 앱요약, type 앱종류 } from './dashboardProject.js';
import { db } from './insights.js';

export interface 볼서비스 { id: number; prefix: string; name: string; kind: 앱종류 }

interface 목표 { metric: string; scope?: string; value: number }

export interface 부하요약 {
  runId: number; serviceName: string; scenarioName: string; startedAt: string | null; verdict: 'PASS' | 'FAIL';
  peakVus: number | null; maxTps: number | null; p95Ms: number | null; errorRate: number | null;
  targets: { p95Ms: number | null; errorRate: number | null };
  series: { sec: number; vus: number; rps: number; p95Ms: number | null }[];
  hosts: { cpu: number | null; mem: number | null; diskKbps: number | null; netKbps: number | null } | null;
}
export interface 페이지요약 {
  runId: number; serviceName: string; startedAt: string | null;
  targets: { lcpMs: number | null; fcpMs: number | null; cls: number | null };
  rows: { url: string; lcpMs: number | null; fcpMs: number | null; cls: number | null }[];
}
export interface 기기요약줄 {
  runId: number; serviceName: string; device: string | null; startedAt: string | null; verdict: 'PASS' | 'FAIL';
  avgCpu: number | null; maxMemMb: number | null; launchMs: number | null; jankPct: number | null;
  avgFps: number | null; low1Fps: number | null; freezeCount: number | null; maxTempC: number | null;
}
export interface 프로젝트요약 {
  apps: 앱요약[];
  e2e: E2E요약;
  perf: { load: 부하요약 | null; pages: 페이지요약 | null; app: 기기요약줄 | null; game: 기기요약줄 | null };
}

interface 실행줄 {
  id: string; kind: 'LOAD' | 'PAGE' | 'DEVICE'; service_id: string; verdict: 'PASS' | 'FAIL'; started_at: Date | null;
  peak_vus: number | null; max_tps: string | null; p95_ms: number | null; error_rate: string | null;
  targets: 목표[] | null; config: unknown; scenario_name: string | null;
}

const 수 = (v: string | number | null): number | null => (v === null ? null : Number(v));
const 목표값 = (t: 목표[] | null, metric: string): number | null => t?.find((x) => x.metric === metric && (x.scope ?? '') === '')?.value ?? null;
const 평균 = (v: number[]): number | null => (v.length === 0 ? null : Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10);

// 판정이 난 실행만 본다 — 도는 · 멈춘 · 오류 측정은 반쪽 숫자다. 서비스 · 종류마다 가장 최근 하나
async function 최근성능(ids: number[]): Promise<실행줄[]> {
  const r = await (await db()).query<실행줄>(
    `SELECT DISTINCT ON (r.service_id, r.kind) r.id, r.kind, r.service_id, r.verdict, r.started_at, r.peak_vus, r.max_tps, r.p95_ms, r.error_rate,
            r.targets, r.config, s.name AS scenario_name
       FROM perf_run r LEFT JOIN perf_scenario s ON s.id = r.scenario_id
      WHERE r.service_id = ANY($1::bigint[]) AND r.verdict IS NOT NULL
      ORDER BY r.service_id, r.kind, r.id DESC`,
    [ids],
  );
  return r.rows;
}

async function 페이지줄(runIds: number[]): Promise<Map<number, 페이지요약['rows']>> {
  if (runIds.length === 0) return new Map();
  const r = await (await db()).query<{ run_id: string; url: string; lcp_ms: number | null; fcp_ms: number | null; cls: string | null }>(
    `SELECT DISTINCT ON (run_id, url) run_id, url, lcp_ms, fcp_ms, cls FROM perf_page_metric
      WHERE run_id = ANY($1::bigint[]) ORDER BY run_id, url, id DESC`,
    [runIds],
  );
  const 모음 = new Map<number, 페이지요약['rows']>();
  for (const x of r.rows) {
    const id = Number(x.run_id);
    모음.set(id, [...(모음.get(id) ?? []), { url: x.url, lcpMs: x.lcp_ms, fcpMs: x.fcp_ms, cls: 수(x.cls) }]);
  }
  return 모음;
}

async function 기기숫자(run: 실행줄, 이름: string): Promise<기기요약줄> {
  const 줄들 = await 기기줄읽기(Number(run.id));
  const 요약 = 기기요약하기(줄들);
  const cfg = run.config as Partial<DeviceRunConfig>;
  const 실행시간 = (cfg.devices ?? []).map((d) => d.launchMs).filter((v): v is number => v !== null);
  return {
    runId: Number(run.id), serviceName: 이름, device: cfg.devices?.[0]?.model ?? null, startedAt: run.started_at?.toISOString() ?? null, verdict: run.verdict,
    avgCpu: 요약.avgCpu, maxMemMb: 요약.maxMemMb, launchMs: 실행시간.length === 0 ? null : Math.max(...실행시간),
    jankPct: 평균(줄들.map((x) => x.jankPct).filter((v): v is number => v !== null).map(Number)),
    avgFps: 요약.avgFps, low1Fps: 요약.low1Fps, freezeCount: 요약.freezeCount, maxTempC: 요약.maxTempC,
  };
}

async function 부하숫자(run: 실행줄, 이름: string): Promise<부하요약> {
  const pool = await db();
  const id = Number(run.id);
  const [초, 호스트] = await Promise.all([
    pool.query<{ sec: number; vus: number; requests: number; hist: number[] }>(`SELECT sec, vus, requests, hist FROM perf_series WHERE run_id = $1 AND tx = '' ORDER BY sec`, [id]),
    pool.query<{ cpu: string | null; mem: string | null; disk: number | null; net: number | null }>(
      `SELECT MAX(cpu) AS cpu, MAX(mem) AS mem, MAX(disk_io_kbps) AS disk, MAX(net_in_kbps + net_out_kbps) AS net FROM perf_host_metric WHERE run_id = $1`,
      [id],
    ),
  ]);
  const h = 호스트.rows[0];
  return {
    runId: id, serviceName: 이름, scenarioName: run.scenario_name ?? '', startedAt: run.started_at?.toISOString() ?? null, verdict: run.verdict,
    peakVus: run.peak_vus, maxTps: 수(run.max_tps), p95Ms: run.p95_ms, errorRate: 수(run.error_rate),
    targets: { p95Ms: 목표값(run.targets, 'P95'), errorRate: 목표값(run.targets, 'ERROR_RATE') },
    series: 솎기(초.rows).map((x) => ({ sec: x.sec, vus: x.vus, rps: x.requests, p95Ms: percentile(x.hist, 0.95) })),
    hosts: h === undefined || (h.cpu === null && h.mem === null && h.disk === null && h.net === null) ? null : { cpu: 수(h.cpu), mem: 수(h.mem), diskKbps: h.disk, netKbps: h.net },
  };
}

/** 가장 최근 실행 — 번호가 클수록 나중에 만든 실행이다 */
const 가장최근 = (줄들: 실행줄[]): 실행줄 | null => 줄들.reduce<실행줄 | null>((a, b) => (a === null || Number(b.id) > Number(a.id) ? b : a), null);

/**
 * 프로젝트 요약 — `서비스들` 은 실행 read 인 그 프로젝트 애플리케이션, `작성ids` 는 그 가운데 작성 read 인 것.
 * 마지막 결과는 last-by-case 와 같은 질의로 한 번에 읽는다
 */
export async function 프로젝트요약읽기(서비스들: 볼서비스[], 작성ids: number[]): Promise<프로젝트요약> {
  const pool = await db();
  const ids = 서비스들.map((s) => s.id);
  const 이름 = new Map(서비스들.map((s) => [s.id, s.name]));
  const [결과들, 케이스, 성능, 시나리오들, PRD들] = await Promise.all([
    lastByCase(서비스들.map((s) => s.prefix)),
    pool.query<{ tc_id: string; platforms: Platform[] }>(
      `SELECT tc_id, platforms FROM test_case WHERE is_active AND split_part(tc_id, '-', 1) = ANY($1) ORDER BY tc_id`,
      [서비스들.map((s) => s.prefix)],
    ),
    최근성능(ids),
    Promise.all(서비스들.map((s) => 시나리오목록(s.id))),
    Promise.all(서비스들.map(async (s) => (작성ids.includes(s.id) ? { 판: await 지금판(s.id), 지도: await 케이스지도(s.id) } : null))),
  ]);
  const 결과표 = new Map(결과들.map((l) => [`${l.tcId}:${l.platform}`, l.status]));
  const 결과 = (tcId: string, p: Platform) => 결과표.get(`${tcId}:${p}`);

  const 페이지실행 = 성능.filter((r) => r.kind === 'PAGE');
  const 페이지들 = await 페이지줄(페이지실행.map((r) => Number(r.id)));
  const 종류 = new Map(서비스들.map((s) => [s.id, s.kind]));
  const 기기실행 = (k: 앱종류) => 성능.filter((r) => r.kind === 'DEVICE' && 종류.get(Number(r.service_id)) === k);
  const [게임숫자들, 앱최근, 부하최근] = await Promise.all([
    Promise.all(기기실행('GAME').map((r) => 기기숫자(r, 이름.get(Number(r.service_id)) ?? ''))),
    (async () => { const r = 가장최근(기기실행('APP')); return r === null ? null : 기기숫자(r, 이름.get(Number(r.service_id)) ?? ''); })(),
    (async () => { const r = 가장최근(성능.filter((x) => x.kind === 'LOAD')); return r === null ? null : 부하숫자(r, 이름.get(Number(r.service_id)) ?? ''); })(),
  ]);
  const 페이지최근 = 가장최근(페이지실행);

  const apps = 서비스들.map((s, i): 앱요약 => {
    const 내케이스 = 케이스.rows.filter((c) => c.tc_id.split('-')[0] === s.prefix).map((c) => ({ tcId: c.tc_id, platforms: c.platforms }));
    const 내페이지 = 페이지실행.find((r) => Number(r.service_id) === s.id);
    const 느린 = (내페이지 === undefined ? [] : 페이지들.get(Number(내페이지.id)) ?? []).filter((x) => x.lcpMs !== null).sort((a, b) => b.lcpMs! - a.lcpMs!)[0];
    const 내게임 = 게임숫자들.find((g) => 기기실행('GAME').some((r) => Number(r.id) === g.runId && Number(r.service_id) === s.id));
    const 내부하 = 성능.find((r) => r.kind === 'LOAD' && Number(r.service_id) === s.id);
    const prd = PRD들[i];
    return {
      serviceId: s.id, name: s.name, prefix: s.prefix, kind: s.kind,
      prd: prd === null || prd === undefined ? null : PRD셈(prd.판, prd.지도, 결과),
      ...케이스셈(내케이스, 결과),
      scenarios: 시나리오들[i]?.length ?? 0,
      extra: {
        pageLcp: 느린 === undefined ? null : { url: 느린.url, ms: 느린.lcpMs! },
        fps: 내게임?.avgFps ?? null,
        p95Ms: 내부하?.p95_ms ?? null,
      },
    };
  });

  const e2e = E2E셈(
    서비스들.flatMap((s, i) =>
      (시나리오들[i] ?? []).map((x) => ({ id: x.id, name: x.name, serviceName: s.name, platform: x.platform, steps: x.partCount, lastRun: x.lastRun })),
    ),
  );

  return {
    apps,
    e2e,
    perf: {
      load: 부하최근,
      pages: 페이지최근 === null ? null : {
        runId: Number(페이지최근.id), serviceName: 이름.get(Number(페이지최근.service_id)) ?? '', startedAt: 페이지최근.started_at?.toISOString() ?? null,
        targets: { lcpMs: 목표값(페이지최근.targets, 'LCP'), fcpMs: 목표값(페이지최근.targets, 'FCP'), cls: 목표값(페이지최근.targets, 'CLS') },
        rows: 페이지들.get(Number(페이지최근.id)) ?? [],
      },
      app: 앱최근,
      game: 게임숫자들.reduce<기기요약줄 | null>((a, b) => (a === null || b.runId > a.runId ? b : a), null),
    },
  };
}
