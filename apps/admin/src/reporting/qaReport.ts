// 애플리케이션 QA 리포트 다시 만들기 — 실행이 끝날 때마다 그 묶음의 승인 전 버전을 새 재료로 덮거나 승인 뒤면 버전을 올린다 (도메인/리포팅 §3.17 결정 4 · 12 「묶음 · 버전」)

import type { Pool, PoolClient } from 'pg';

import { 첫장을센다, type 묶음 } from './qaReportSummary.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 대상 = { runId: number } | { perfRunId: number };

/** 빌드 번호에 ':' 가 와도 두 묶음이 한 열쇠가 되지 않게 감싼다 (공통/4-데이터모델 「QA 리포트 표」 bundle_key) */
export const 묶음열쇠 = (b: { serviceId: number; env: string; buildNo: string | null; runId?: number; perfRunId?: number }): string =>
  b.buildNo !== null ? `B:${b.serviceId}:${encodeURIComponent(b.env)}:${encodeURIComponent(b.buildNo)}` : b.runId !== undefined ? `R:${b.runId}` : `P:${b.perfRunId}`;

interface 방아쇠 {
  key: string;
  serviceId: number;
  env: string;
  buildNo: string | null;
  /** 끝난 실행 번호 — 승인한 버전이 이미 담았으면 버전을 올리지 않는다 */
  runId: number | null;
  perfRunId: number | null;
  scheduled: boolean;
}

/** 끝난 실행이 어느 묶음을 다시 만들게 하나. 한 건 실행은 붙은 실행의 묶음이고, 빌드가 다르면 어느 묶음도 아니다 */
async function 방아쇠읽기(pool: Pool, 대: 대상): Promise<방아쇠 | null> {
  if ('perfRunId' in 대) {
    const r = (await pool.query<{ service_id: string; env: string; build_no: string | null; origin: string }>('SELECT service_id, env, build_no, origin FROM perf_run WHERE id = $1', [대.perfRunId])).rows[0];
    if (r === undefined) return null;
    const b = { serviceId: Number(r.service_id), env: r.env, buildNo: r.build_no };
    return { ...b, key: 묶음열쇠({ ...b, perfRunId: 대.perfRunId }), runId: null, perfRunId: 대.perfRunId, scheduled: r.origin === 'SCHEDULED' };
  }
  const r = (
    await pool.query<{ run_id: string; service_id: string | null; env: string; build_no: string | null; origin: string; a_run: string | null; a_service: string | null; a_build: string | null; a_env: string | null }>(
      `SELECT r.run_id, r.service_id, r.env, r.build_no, r.origin, a.run_id AS a_run, a.service_id AS a_service, a.build_no AS a_build, a.env AS a_env
         FROM test_run r LEFT JOIN test_run a ON a.run_id = r.rerun_of AND r.origin = 'SINGLE' WHERE r.run_id = $1`,
      [대.runId],
    )
  ).rows[0];
  if (r === undefined) return null;
  if (r.origin === 'SINGLE') {
    if (r.a_run === null || r.a_service === null || r.a_build !== r.build_no) return null;
    const b = { serviceId: Number(r.a_service), env: r.a_env!, buildNo: r.a_build };
    return { ...b, key: 묶음열쇠({ ...b, runId: Number(r.a_run) }), runId: Number(r.run_id), perfRunId: null, scheduled: false };
  }
  if (r.service_id === null) return null;
  const b = { serviceId: Number(r.service_id), env: r.env, buildNo: r.build_no };
  return { ...b, key: 묶음열쇠({ ...b, runId: Number(r.run_id) }), runId: Number(r.run_id), perfRunId: null, scheduled: r.origin === 'SCHEDULED' };
}

interface 실행줄 {
  id: string;
  finished: boolean;
  scheduled: boolean;
  finished_at: Date | null;
}

/** 묶음의 실행 — 한 건 실행은 붙은 실행으로 세므로 빼고, 도는 실행은 담지 않고 수만 센다 */
async function 묶음실행들(c: PoolClient, t: 방아쇠): Promise<{ 실행: 실행줄[]; 성능: 실행줄[] }> {
  // 빌드 없는 묶음은 실행 하나다 — 열쇠의 번호가 그 실행이다
  const 하나 = (앞: string) => (t.key.startsWith(앞) ? Number(t.key.slice(2)) : 0);
  const [곳, 값] = t.buildNo !== null ? ['service_id = $1 AND env = $2 AND build_no = $3', [t.serviceId, t.env, t.buildNo]] : ['', []];
  const 실행 = (
    await c.query<실행줄>(
      `SELECT run_id::text AS id, status <> 'RUNNING' AS finished, origin = 'SCHEDULED' AS scheduled, finished_at FROM test_run
        WHERE origin <> 'SINGLE' AND kind IN ('UI', 'FN', 'SCENARIO', 'COMPAT') AND ${곳 || 'run_id = $1'}`,
      곳 === '' ? [하나('R:')] : 값,
    )
  ).rows;
  const 성능 = (
    await c.query<실행줄>(
      `SELECT id::text AS id, status IN ('DONE', 'STOPPED', 'ERROR') AS finished, origin = 'SCHEDULED' AS scheduled, finished_at FROM perf_run
        WHERE ${곳 || 'id = $1'}`,
      곳 === '' ? [하나('P:')] : 값,
    )
  ).rows;
  return { 실행, 성능 };
}

interface 버전줄 {
  id: string;
  version: number;
  approved_at: Date | null;
  created_at: Date;
  run_ids: string[];
  perf_run_ids: string[];
}

/**
 * 버전이 담을 실행 — 앞 버전이 담은 것 + 끝난 사람 · CI 실행 + 이 버전을 세운 뒤 끝난 정기 실행.
 * 승인한 뒤 이 버전을 세우기 전에 끝난 정기 실행은 넣지 않는다 — 매일 도는 정기 실행으로 버전이 오르면 승인이 하루를 못 간다 (§3.17 「묶음 · 버전」)
 */
export function 담을실행(줄들: 실행줄[], 앞: readonly string[], 세운때: Date | null): number[] {
  const 앞것 = new Set(앞);
  return 줄들
    .filter((r) => r.finished && (앞것.has(r.id) || !r.scheduled || 세운때 === null || (r.finished_at !== null && r.finished_at >= 세운때)))
    .map((r) => Number(r.id))
    .sort((a, b) => a - b);
}

/** 한 묶음을 다시 만든다. 묶음 열쇠로 트랜잭션 잠금을 잡고 그 안에서 마지막 버전을 다시 읽는다 — 실행 둘이 같이 끝나도 버전이 둘 서지 않는다 */
export async function QA리포트를다시만든다(대: 대상): Promise<'없음' | '그대로' | '고침' | '새 버전'> {
  const pool = await db();
  const t = await 방아쇠읽기(pool, 대);
  if (t === null) return '없음';
  const 서비스 = (await pool.query<{ prefix: string; kind: 묶음['serviceKind'] }>('SELECT prefix, kind FROM service WHERE id = $1', [t.serviceId])).rows[0];
  if (서비스 === undefined) return '없음';

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [t.key]);
    const 버전들 = (
      await c.query<버전줄>('SELECT id, version, approved_at, created_at, run_ids, perf_run_ids FROM qa_report WHERE bundle_key = $1 ORDER BY version DESC LIMIT 2', [t.key])
    ).rows;
    const 마지막 = 버전들[0];
    if (마지막?.approved_at != null) {
      const 담음 = t.runId !== null ? 마지막.run_ids.includes(String(t.runId)) : 마지막.perf_run_ids.includes(String(t.perfRunId));
      if (t.scheduled || 담음) {
        await c.query('COMMIT');
        return '그대로';
      }
    }
    // 승인 전 버전은 그 앞 버전이 담은 것을 이어 담는다. 승인한 버전 위에는 지금 세우는 새 버전이다
    const 새로 = 마지막 === undefined || 마지막.approved_at !== null;
    const 앞 = 새로 ? 마지막 : 버전들[1];
    // 새 버전의 created_at 도 이 트랜잭션의 now() 라 같은 시계로 견준다
    const 지금 = (await c.query<{ n: Date }>('SELECT now() AS n')).rows[0]!.n;
    const 세운때 = 앞 === undefined ? null : 새로 ? 지금 : 마지막.created_at;
    const { 실행, 성능 } = await 묶음실행들(c, t);
    const runIds = 담을실행(실행, 앞?.run_ids ?? [], 세운때);
    const perfRunIds = 담을실행(성능, 앞?.perf_run_ids ?? [], 세운때);
    if (runIds.length + perfRunIds.length === 0) {
      await c.query('COMMIT');
      return '그대로';
    }
    const { summary, performers } = await 첫장을센다(pool, {
      serviceId: t.serviceId,
      prefix: 서비스.prefix,
      serviceKind: 서비스.kind,
      env: t.env,
      buildNo: t.buildNo,
      runIds,
      perfRunIds,
      running: [...실행, ...성능].filter((r) => !r.finished).length,
    });
    const 값 = [runIds, perfRunIds, performers, JSON.stringify(summary), summary.overview.serviceName];
    if (새로) {
      await c.query(
        `INSERT INTO qa_report (bundle_key, service_id, service_name, env, build_no, run_id, perf_run_id, version, run_ids, perf_run_ids, performers, summary)
         VALUES ($6, $7, $5, $8, $9, $10, $11, $12, $1, $2, $3, $4)`,
        [
          ...값,
          t.key,
          t.serviceId,
          t.env,
          t.buildNo,
          t.key.startsWith('R:') ? Number(t.key.slice(2)) : null,
          t.key.startsWith('P:') ? Number(t.key.slice(2)) : null,
          (마지막?.version ?? 0) + 1,
        ],
      );
    } else {
      await c.query(
        'UPDATE qa_report SET run_ids = $1, perf_run_ids = $2, performers = $3, summary = $4, service_name = $5, updated_at = now() WHERE id = $6',
        [...값, 마지막!.id],
      );
    }
    await c.query('COMMIT');
    return 새로 ? '새 버전' : '고침';
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

// 한 번에 하나 — 실행이 몰려 끝나도 연결을 여럿 붙들지 않는다. 앞 일이 깨져도 줄은 계속 돈다
let 줄: Promise<unknown> = Promise.resolve();

/** 실행이 끝난 자리에서 부른다. 깨져도 실행은 이미 끝났다 — 로그만 남기고 다음 실행 끝이 다시 만든다 */
export function QA리포트를맡긴다(대: 대상): Promise<void> {
  const 일 = 줄.then(() => QA리포트를다시만든다(대)).then(
    () => undefined,
    (err: unknown) => {
      console.error(`[qa-report] ${JSON.stringify(대)} 의 QA 리포트를 다시 만들지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    },
  );
  줄 = 일;
  return 일;
}
