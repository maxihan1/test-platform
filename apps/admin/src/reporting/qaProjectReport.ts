// 프로젝트 QA 리포트 만들기 · 읽기 · 목록 · 남은 리스크 문장 고치기 (도메인/리포팅 §3.17 「프로젝트 QA 리포트 — 기간 상태」 · §7 「QA 리포트 통로」)
// 만든 때 숫자로 굳힌다 — 같은 기간을 다시 만들면 새 줄이다. 승인 · 지문은 없다(결정 14)

import type { Pool, PoolClient } from 'pg';

import { 프로젝트숫자 } from './qaProjectReportCollect.js';
import type { 프로젝트리포트응답, 프로젝트몸 } from './qaProjectReportShape.js';
import type { 리스크글저장 } from './qaReportAi.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export const 목록쪽크기 = 50;

async function 한트랜잭션<T>(일: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    const 값 = await 일(c);
    await c.query('COMMIT');
    return 값;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

/**
 * 숫자를 모아 굳히고 AI 일을 세운다. AI 일 표는 애플리케이션 칸이 꼭 차야 해서 대표 애플리케이션(꺼졌거나 비면 활성 애플리케이션 중 번호가 가장 작은 것)으로 세운다.
 * 활성 애플리케이션이 없으면 일을 안 세운다 — 읽을 때 「AI 문단을 만들지 못했습니다」다
 */
export async function 프로젝트리포트만들기(projectId: number, 기간: { from: string; to: string; tz: string }, origin: 'MANUAL' | 'SCHEDULED', 만든이: string): Promise<number> {
  const pool = await db();
  const 앞 = (
    await pool.query<{ id: string; period_from: string; period_to: string }>(
      `SELECT id, to_char(period_from, 'YYYY-MM-DD') AS period_from, to_char(period_to, 'YYYY-MM-DD') AS period_to
         FROM qa_project_report WHERE project_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
      [projectId],
    )
  ).rows[0];
  const 몸 = await 프로젝트숫자(pool, projectId, 기간, 앞 === undefined ? null : { id: Number(앞.id), from: 앞.period_from, to: 앞.period_to });
  return 한트랜잭션(async (c) => {
    const id = Number(
      (
        await c.query<{ id: string }>(
          `INSERT INTO qa_project_report (project_id, project_name, period_from, period_to, tz, origin, body, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [projectId, 몸.project.name, 기간.from, 기간.to, 기간.tz, origin, JSON.stringify(몸), 만든이],
        )
      ).rows[0]!.id,
    );
    const 대표 = (
      await c.query<{ id: string }>(
        `SELECT s.id FROM service s JOIN project p ON p.id = s.project_id
          WHERE s.project_id = $1 AND s.is_active ORDER BY (s.id = p.primary_service_id) DESC, s.id LIMIT 1`,
        [projectId],
      )
    ).rows[0];
    if (대표 !== undefined) {
      const 일 = await c.query<{ id: string }>(
        `INSERT INTO perf_ai_job (kind, service_id, input, status, created_by) VALUES ('REPORT_RISK', $1, $2, 'QUEUED', '스케줄러') RETURNING id`,
        [대표.id, JSON.stringify({ projectReportId: id })],
      );
      await c.query('UPDATE qa_project_report SET ai_job_id = $1 WHERE id = $2', [일.rows[0]!.id, id]);
    }
    return id;
  });
}

interface 리포트행 {
  id: string;
  project_id: string | null;
  project_name: string;
  period_from: string;
  period_to: string;
  tz: string;
  origin: 'MANUAL' | 'SCHEDULED';
  body: 프로젝트몸;
  ai: 리스크글저장 | null;
  ai_job_id: string | null;
  job_status: string | null;
  created_by: string;
  created_at: Date;
}

/** 리포트 하나. aiPending 은 AI 일이 아직 기다리거나 도는 중 — 부르는 쪽이 꺼진 에이전트 일을 닫고 다시 읽는다 */
export async function 프로젝트리포트읽기(id: number): Promise<{ 응답: 프로젝트리포트응답; aiPending: boolean } | null> {
  const r = (
    await (await db()).query<리포트행>(
      `SELECT r.id, r.project_id, r.project_name, to_char(r.period_from, 'YYYY-MM-DD') AS period_from, to_char(r.period_to, 'YYYY-MM-DD') AS period_to,
              r.tz, r.origin, r.body, r.ai, r.ai_job_id, j.status AS job_status, r.created_by, r.created_at
         FROM qa_project_report r LEFT JOIN perf_ai_job j ON j.id = r.ai_job_id WHERE r.id = $1`,
      [id],
    )
  ).rows[0];
  if (r === undefined) return null;
  const 기다림 = r.job_status === 'QUEUED' || r.job_status === 'RUNNING';
  // 실패는 저장하지 않고 읽을 때 일 상태로 낸다 — 애플리케이션 리포트와 같은 길(§3.17 「QAR-F1-08 이 정한 것」). 일이 없으면(애플리케이션이 없었다) 못 만든 것이다
  const ai = r.ai ?? (기다림 ? null : { failed: true as const });
  return {
    응답: {
      id: Number(r.id),
      projectId: r.project_id === null ? null : Number(r.project_id),
      projectName: r.project_name,
      from: r.period_from,
      to: r.period_to,
      tz: r.tz,
      origin: r.origin,
      body: r.body,
      ai,
      createdBy: r.created_by,
      createdAt: r.created_at.toISOString(),
    },
    aiPending: r.ai === null && 기다림,
  };
}

/** 리포트의 프로젝트 — 문이 배정을 볼 때 쓴다. 없는 번호는 undefined, 프로젝트를 지운 리포트는 null */
export async function 리포트프로젝트(id: number): Promise<number | null | undefined> {
  const r = (await (await db()).query<{ project_id: string | null }>('SELECT project_id FROM qa_project_report WHERE id = $1', [id])).rows[0];
  return r === undefined ? undefined : r.project_id === null ? null : Number(r.project_id);
}

export async function 프로젝트리포트목록(projectId: number, 쪽: number) {
  const pool = await db();
  const [r, 수] = await Promise.all([
    pool.query<{ id: string; period_from: string; period_to: string; origin: 'MANUAL' | 'SCHEDULED'; created_by: string; created_at: Date }>(
      `SELECT id, to_char(period_from, 'YYYY-MM-DD') AS period_from, to_char(period_to, 'YYYY-MM-DD') AS period_to, origin, created_by, created_at
         FROM qa_project_report WHERE project_id = $1 ORDER BY created_at DESC, id DESC LIMIT ${목록쪽크기} OFFSET $2`,
      [projectId, (쪽 - 1) * 목록쪽크기],
    ),
    pool.query<{ n: string }>('SELECT count(*) AS n FROM qa_project_report WHERE project_id = $1', [projectId]),
  ]);
  return {
    items: r.rows.map((x) => ({ id: Number(x.id), from: x.period_from, to: x.period_to, origin: x.origin, createdBy: x.created_by, createdAt: x.created_at.toISOString() })),
    total: Number(수.rows[0]!.n),
  };
}

/** 사람이 문단을 고친다. 처음 글은 남는다. 아직 안 가져간 AI 일은 닫는다 — 고친 글은 다시 맡기지 않는다 */
export async function 프로젝트리스크고치기(id: number, text: string, 고친이: string): Promise<{ ai: 리스크글저장 } | 'NOT_FOUND'> {
  return 한트랜잭션(async (c) => {
    // 줄을 잠그고 읽는다 — AI 처음 글이 들어오는 순간과 겹쳐도 처음 글을 빈 글로 덮지 않는다
    const q = (await c.query<{ ai: 리스크글저장 | null; ai_job_id: string | null }>('SELECT ai, ai_job_id FROM qa_project_report WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (q === undefined) return 'NOT_FOUND';
    const at = (await c.query<{ n: Date }>('SELECT now() AS n')).rows[0]!.n;
    const 글: 리스크글저장 = { first: q.ai?.first ?? '', current: text, editedBy: 고친이, editedAt: at.toISOString() };
    await c.query('UPDATE qa_project_report SET ai = $2 WHERE id = $1', [id, JSON.stringify(글)]);
    if (q.ai_job_id !== null) {
      await c.query(`UPDATE perf_ai_job SET status = 'FAILED', error = '사람이 문단을 고쳐 맡기지 않습니다', finished_at = now() WHERE id = $1 AND status = 'QUEUED'`, [q.ai_job_id]);
    }
    return { ai: 글 };
  });
}
