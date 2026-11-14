// 애플리케이션 QA 리포트 읽기 통로 — 목록 · 한 버전 · 실행이 든 리포트 찾기 (도메인/리포팅 §7 「QA 리포트 통로」)
// 배정과 권한(실행 read)은 문(auth/gate.ts)이 이미 봤다. 여기서는 번호 · 질의 모양만 본다

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'NOT_FOUND' });
const 쪽크기 = 50;

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 리포트행 {
  id: string;
  bundle_key: string;
  prefix: string | null;
  env: string;
  build_no: string | null;
  run_id: string | null;
  perf_run_id: string | null;
  version: number;
  run_ids: string[];
  perf_run_ids: string[];
  performers: string[];
  summary: { kinds?: string[]; overview?: { running?: number } };
  ai: unknown;
  approved_by: string | null;
  approved_name: string | null;
  approved_at: Date | null;
  pdf_sha256: string | null;
  updated_at: Date;
}

const 번호 = (v: string | null): number | null => (v === null ? null : Number(v));

export default async function qaReportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: Record<string, unknown> }>('/qa-reports', async (req, reply) => {
    const { service, env, approved, page } = req.query;
    if (typeof service !== 'string' || service === '') return 잘못(reply, 'service 접두사가 필요합니다');
    if (env !== undefined && (typeof env !== 'string' || env === '')) return 잘못(reply, 'env 가 틀렸습니다');
    if (approved !== undefined && approved !== 'true' && approved !== 'false') return 잘못(reply, 'approved 는 true · false 중 하나입니다');
    const 쪽 = page === undefined ? 1 : typeof page === 'string' ? 정수(page) : null;
    if (쪽 === null) return 잘못(reply, 'page 번호가 틀렸습니다');
    const 승인 = approved === undefined ? null : approved === 'true';
    // 묶음마다 마지막 버전 한 줄. 차례는 마지막 실행이 끝난 시각(만든 때 굳힌 개요) 내림차순 — 도는 묶음은 끝난 시각이 없어 맨 앞이다
    const r = await (await db()).query<리포트행 & { total: string }>(
      `WITH 마지막 AS (
         SELECT DISTINCT ON (q.bundle_key) q.*, s.prefix FROM qa_report q JOIN service s ON s.id = q.service_id
          WHERE s.prefix = $1 AND ($2::text IS NULL OR q.env = $2) ORDER BY q.bundle_key, q.version DESC)
       SELECT *, count(*) OVER () AS total FROM 마지막
        WHERE $3::boolean IS NULL OR (approved_at IS NOT NULL) = $3
        ORDER BY summary->'overview'->>'finishedAt' DESC NULLS FIRST, id DESC
        LIMIT ${쪽크기} OFFSET $4`,
      [service, env ?? null, 승인, (쪽 - 1) * 쪽크기],
    );
    return {
      items: r.rows.map((q) => ({
        id: Number(q.id),
        service: q.prefix,
        env: q.env,
        buildNo: q.build_no,
        runId: 번호(q.run_id),
        perfRunId: 번호(q.perf_run_id),
        version: q.version,
        kinds: q.summary.kinds ?? [],
        running: q.summary.overview?.running ?? 0,
        approvedBy: q.approved_name ?? q.approved_by,
        approvedAt: q.approved_at?.toISOString() ?? null,
        updatedAt: q.updated_at.toISOString(),
      })),
      total: Number(r.rows[0]?.total ?? 0),
    };
  });

  app.get<{ Params: { id: string } }>('/qa-reports/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const pool = await db();
    const q = (await pool.query<리포트행>('SELECT q.*, s.prefix FROM qa_report q LEFT JOIN service s ON s.id = q.service_id WHERE q.id = $1', [id])).rows[0];
    if (q === undefined) return 없음(reply);
    const 버전들 = (
      await pool.query<{ id: string; version: number; approved_at: Date | null }>('SELECT id, version, approved_at FROM qa_report WHERE bundle_key = $1 ORDER BY version', [q.bundle_key])
    ).rows;
    let approval = null;
    if (q.approved_at !== null) {
      // 그 빌드의 배포보다 늦게 승인했으면 사후 승인이다. 배포가 없으면 붙이지 않는다 (§3.17 「첫 장」 승인)
      const 배포 = (await pool.query<{ at: Date | null }>('SELECT min(created_at) AS at FROM bts_deploy WHERE run_ids && $1::bigint[]', [q.run_ids])).rows[0]?.at ?? null;
      approval = { by: q.approved_by, byName: q.approved_name, at: q.approved_at.toISOString(), late: 배포 !== null && q.approved_at > 배포, sha256: q.pdf_sha256 };
    }
    return {
      id: Number(q.id),
      service: q.prefix,
      env: q.env,
      buildNo: q.build_no,
      runId: 번호(q.run_id),
      perfRunId: 번호(q.perf_run_id),
      version: q.version,
      versions: 버전들.map((v) => ({ id: Number(v.id), version: v.version, approvedAt: v.approved_at?.toISOString() ?? null })),
      summary: q.summary,
      ai: q.ai,
      runIds: q.run_ids.map(Number),
      perfRunIds: q.perf_run_ids.map(Number),
      performers: q.performers,
      approval,
      updatedAt: q.updated_at.toISOString(),
    };
  });

  // 한 건 실행은 붙은 실행으로 센다 — 그 실행이 든 리포트다 (§3.17 「묶음 · 버전」)
  app.get<{ Params: { runId: string } }>('/runs/:runId/qa-report', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return 잘못(reply, '실행 번호가 틀렸습니다');
    const r = await (await db()).query<{ id: string }>(
      `SELECT q.id FROM test_run t JOIN qa_report q ON q.run_ids @> ARRAY[CASE WHEN t.origin = 'SINGLE' THEN t.rerun_of ELSE t.run_id END]
        WHERE t.run_id = $1 ORDER BY q.version DESC LIMIT 1`,
      [runId],
    );
    return r.rows[0] === undefined ? 없음(reply) : { id: Number(r.rows[0].id) };
  });

  app.get<{ Params: { id: string } }>('/perf/runs/:id/qa-report', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '실행 번호가 틀렸습니다');
    const r = await (await db()).query<{ id: string }>('SELECT id FROM qa_report WHERE perf_run_ids @> ARRAY[$1::bigint] ORDER BY version DESC LIMIT 1', [id]);
    return r.rows[0] === undefined ? 없음(reply) : { id: Number(r.rows[0].id) };
  });
}
