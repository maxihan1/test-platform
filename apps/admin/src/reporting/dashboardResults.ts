// 앱 대시보드(GET /api/dashboard)가 부르는 질의 — 접은 줄 · 앞 실행 · 실행 중 · 요구사항 커버리지를 읽어 집계 함수에 넘긴다 (도메인/리포팅 §8.12)
// 읽기 전용이다. 서비스 경계는 호출부가 넘긴 id 목록이 전부다 — 여기서는 그 밖의 서비스 행을 읽지 않는다

import type { Pool } from 'pg';

import { 뿌리 } from '../authoring/history.js';
import {
  창날수,
  커버리지날수,
  날짜더하기,
  대시보드집계,
  type 셈,
  type 앞판정,
  type 접은줄,
} from './dashboardShape.js';
import { 접은줄SQL, 앞판정SQL, 실행중SQL, 커버리지SQL } from './dashboardSql.js';
import { db, 한줄로자른다 } from './insights.js';

/** 부르는 쪽이 400 INVALID_REQUEST 로 바꾼다 */
export class 틀린시간대 extends Error {
  constructor(readonly 받은값: string) {
    super(`시간대를 알 수 없다: ${받은값}`);
  }
}

// 이름표 목록은 서버가 도는 동안 안 바뀐다. 처음 한 번만 읽는다
let 시간대들: Promise<Set<string>> | undefined;

async function 시간대확인(pool: Pool, tz: string): Promise<void> {
  시간대들 ??= pool
    .query<{ name: string }>('SELECT name FROM pg_timezone_names')
    .then((r) => new Set(r.rows.map((row) => row.name)));
  if (!(await 시간대들).has(tz)) throw new 틀린시간대(tz);
}

export interface 건수 {
  pass: number;
  fail: number;
  notRun: number;
}

const 건수로 = (셈값: 셈): 건수 => ({ pass: 셈값.통과, fail: 셈값.실패, notRun: 셈값.미실행 });

export interface 실행중 {
  runId: number;
  serviceId: number;
  serviceName: string;
  title: string;
  doneItems: number;
  totalItems: number;
  failedItems: number;
  startedAt: string;
}

export interface 커버리지 {
  serviceId: number;
  serviceName: string;
  cased: number;
  total: number;
  /** 요구가 0 이면 null */
  ratio: number | null;
  finishedAt: string;
  /** 작성 화면에서 보이는 요청 번호(뿌리) */
  requestId: number;
}

export interface 대시보드응답 {
  window: { tz: string; today: string; days: number; from: string; previousFrom: string };
  services: { id: number; name: string }[];
  passRate: { current: 건수; previous: 건수 };
  daily: ({ day: string } & 건수)[];
  newFailures: {
    runId: number;
    serviceId: number;
    serviceName: string;
    env: string;
    kind: 'UI' | 'FN';
    tcId: string;
    tcName: string;
    platform: 'desktop' | 'mobile';
    finishedAt: string;
    reason: string | null;
  }[];
  byService: {
    serviceId: number;
    serviceName: string;
    current: 건수;
    previous: 건수;
    lastRun: ({ runId: number; finishedAt: string } & 건수) | null;
    flow: ('F' | 'P' | 'N')[];
    newFailureCount: number;
    resolvedCount: number;
  }[];
  heatmap: { tcId: string; tcName: string; failCount: number; cells: (0 | 1 | 2)[] }[];
  coverage: 커버리지[];
  running: 실행중[];
  unconfirmed: number;
}

interface 줄행 {
  run_id: string;
  service_id: string;
  service_name: string;
  env: string;
  kind: 'UI' | 'FN';
  day: string;
  finished_at: Date;
  tc_id: string;
  tc_name: string;
  platform: 'desktop' | 'mobile';
  verdict: 접은줄['verdict'];
  unconfirmed: boolean;
  reason: string | null;
}

async function 실행중읽기(pool: Pool, ids: number[]): Promise<실행중[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query<{
    run_id: string;
    service_id: string;
    service_name: string;
    title: string;
    started_at: Date;
    total: string;
    done: string;
    failed: string;
  }>(실행중SQL, [ids]);
  return rows.map((r) => ({
    runId: Number(r.run_id),
    serviceId: Number(r.service_id),
    serviceName: r.service_name,
    title: r.title,
    doneItems: Number(r.done),
    totalItems: Number(r.total),
    failedItems: Number(r.failed),
    startedAt: r.started_at.toISOString(),
  }));
}

async function 커버리지읽기(pool: Pool, ids: number[]): Promise<커버리지[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query<{
    id: string;
    service_id: string;
    name: string;
    coverage_cased: number;
    coverage_total: number;
    finished_at: Date;
  }>(커버리지SQL, [ids, 커버리지날수]);
  return Promise.all(
    rows.map(async (r) => ({
      serviceId: Number(r.service_id),
      serviceName: r.name,
      cased: r.coverage_cased,
      total: r.coverage_total,
      ratio: r.coverage_total === 0 ? null : r.coverage_cased / r.coverage_total,
      finishedAt: r.finished_at.toISOString(),
      requestId: (await 뿌리(Number(r.id))) ?? Number(r.id),
    })),
  );
}

async function 줄읽기(pool: Pool, ids: number[], tz: string, 오늘: string): Promise<접은줄[]> {
  if (ids.length === 0) return [];
  const 하한 = 날짜더하기(오늘, -(창날수 * 2 - 1));
  const { rows } = await pool.query<줄행>(접은줄SQL, [ids, tz, 하한]);
  return rows.map((r) => ({
    runId: Number(r.run_id),
    serviceId: Number(r.service_id),
    serviceName: r.service_name,
    env: r.env,
    kind: r.kind,
    day: r.day,
    finishedAt: r.finished_at.toISOString(),
    tcId: r.tc_id,
    tcName: r.tc_name,
    platform: r.platform,
    verdict: r.verdict,
    unconfirmed: r.unconfirmed,
    reason: r.reason === null ? null : 한줄로자른다(r.reason) || null,
  }));
}

async function 앞판정읽기(pool: Pool, runIds: number[]): Promise<Map<number, 앞판정[]>> {
  const 결과 = new Map<number, 앞판정[]>();
  if (runIds.length === 0) return 결과;
  const { rows } = await pool.query<{
    this_run: string;
    tc_id: string;
    platform: 앞판정['platform'];
    verdict: 앞판정['verdict'];
    unconfirmed: boolean;
  }>(앞판정SQL, [runIds]);
  for (const r of rows) {
    const 목록 = 결과.get(Number(r.this_run)) ?? [];
    목록.push({ tcId: r.tc_id, platform: r.platform, verdict: r.verdict, unconfirmed: r.unconfirmed });
    결과.set(Number(r.this_run), 목록);
  }
  return 결과;
}

/** 화면이 15초마다 부르는 가벼운 쪽 — 집계는 안 돌고 실행 중 줄만 읽는다. tz 는 안 쓰지만 같은 통로라 틀린 이름은 똑같이 거절한다 */
export async function 대시보드실행중(tz: string, 실행서비스ids: number[]): Promise<{ running: 실행중[] }> {
  const pool = await db();
  await 시간대확인(pool, tz);
  return { running: await 실행중읽기(pool, 실행서비스ids) };
}

/**
 * 앱 대시보드 숫자 한 번에. `실행서비스ids` 는 실행 read 인 배정 서비스, `작성서비스ids` 는 작성 read 인 배정 서비스다.
 * tz 는 pg_timezone_names 에 있는 이름만 받는다 — 아니면 `틀린시간대` 를 던진다
 */
export async function 대시보드(tz: string, 실행서비스ids: number[], 작성서비스ids: number[]): Promise<대시보드응답> {
  const pool = await db();
  await 시간대확인(pool, tz);

  const 오늘 = (
    await pool.query<{ today: string }>(`SELECT to_char((now() AT TIME ZONE $1::text)::date, 'YYYY-MM-DD') AS today`, [tz])
  ).rows[0]!.today;
  const 줄들 = await 줄읽기(pool, 실행서비스ids, tz, 오늘);
  const [앞판정들, running, coverage, 서비스] = await Promise.all([
    앞판정읽기(pool, [...new Set(줄들.map((줄) => 줄.runId))]),
    실행중읽기(pool, 실행서비스ids),
    커버리지읽기(pool, 작성서비스ids),
    pool.query<{ id: string; name: string }>('SELECT id, name FROM service WHERE id = ANY($1::bigint[]) ORDER BY id', [
      실행서비스ids,
    ]),
  ]);

  const 집계 = 대시보드집계(줄들, 앞판정들, 오늘);
  return {
    window: {
      tz,
      today: 오늘,
      days: 창날수,
      from: 날짜더하기(오늘, -(창날수 - 1)),
      previousFrom: 날짜더하기(오늘, -(창날수 * 2 - 1)),
    },
    services: 서비스.rows.map((r) => ({ id: Number(r.id), name: r.name })),
    passRate: { current: 건수로(집계.이번), previous: 건수로(집계.직전) },
    daily: 집계.일별.map((d) => ({ day: d.day, ...건수로(d) })),
    newFailures: 집계.신규실패,
    byService: 집계.서비스별.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      current: 건수로(s.이번),
      previous: 건수로(s.직전),
      lastRun: s.마지막실행 === null ? null : { runId: s.마지막실행.runId, finishedAt: s.마지막실행.finishedAt, ...건수로(s.마지막실행) },
      flow: s.흐름,
      newFailureCount: s.신규실패수,
      resolvedCount: s.해결수,
    })),
    heatmap: 집계.히트맵.map((h) => ({ tcId: h.tcId, tcName: h.tcName, failCount: h.실패수, cells: h.칸 })),
    coverage,
    running,
    unconfirmed: 집계.미확정건수,
  };
}
