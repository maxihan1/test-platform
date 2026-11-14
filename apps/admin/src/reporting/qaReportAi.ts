// QA 리포트 남은 리스크 AI 일 — 세우기 · 가져갈 때 재료 굳히기 · 결과 저장 · 사람이 고치기 · 꺼진 에이전트를 기다리는 일 닫기 (도메인/리포팅 §3.17 「남은 리스크 — AI」)

import type { Pool, PoolClient } from 'pg';

import { 묶음잠금 } from './qaReport.js';
import type { 리스크결과 } from './qaReportAiShape.js';
import { 안정화읽기 } from './qaReportNonFunc.js';

// 성능 AI 일 · 흐름 후보 모듈은 쓸 때 불러온다 — 성능 실행 저장(perf/store.ts)이 QA 리포트를 부르고 perf/ai.ts 가 성능 시나리오를 불러 고리가 생긴다
const 성능AI = () => import('../perf/ai.js');
const 흐름일 = () => import('../scenario/flowJob.js');

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** qa_report.ai 에 두는 꼴. 실패는 두지 않고 읽을 때 일 상태로 낸다(qaReportDoc.ts) — 오래 쥔 일 닫기가 리포트를 몰라도 「만들지 못했습니다」가 선다 */
export interface 리스크글저장 {
  first: string;
  current: string;
  editedBy: string | null;
  editedAt: string | null;
}

// 재료 배열은 이만큼만 싣는다 — 실패 수천 건짜리 빌드도 프롬프트 한도 안에 든다
export const 배열상한 = 100;
// 맡긴 뒤 이만큼 아무도 안 가져가고 에이전트가 꺼져 있으면 실패로 닫는다 — 그 일이 승인을 막는다(AI_PENDING)
const 대기닫기분 = 5;

/**
 * 다시 만든 뒤 새 일을 세울까. 도는 실행이 있으면 다음 끝에서, 사람이 고친 글이 있으면 다시 맡기지 않는다.
 * 앞 일이 실패했으면 첫 장이 같아도 다시 맡긴다 — 에이전트가 꺼져 닫힌 일이 「만들지 못했습니다」로 굳지 않게
 */
export function 리스크일세울까(r: { running: number; 같은첫장: boolean; ai: 리스크글저장 | null; aiJobId: string | null; 앞일실패: boolean }): boolean {
  if (r.running > 0) return false;
  if (r.ai?.editedBy != null) return false;
  return !r.같은첫장 || r.aiJobId === null || r.앞일실패;
}

/** 묶음 잠금 안에서 부른다. 앞 일이 아직 대기면 닫고, 그 버전의 AI 글은 비운다 — 앞 일의 결과는 쓰지 않는다 */
export async function 리스크일세우기(c: Pick<PoolClient, 'query'>, 리포트: { id: string; serviceId: number; 앞일: string | null }): Promise<number> {
  if (리포트.앞일 !== null) {
    await c.query(`UPDATE perf_ai_job SET status = 'FAILED', error = '리포트를 다시 만들어 새 일로 바꿨습니다', finished_at = now() WHERE id = $1 AND status = 'QUEUED'`, [리포트.앞일]);
  }
  const r = await c.query<{ id: string }>(
    `INSERT INTO perf_ai_job (kind, service_id, input, status, created_by) VALUES ('REPORT_RISK', $1, $2, 'QUEUED', '스케줄러') RETURNING id`,
    [리포트.serviceId, JSON.stringify({ reportId: Number(리포트.id) })],
  );
  const id = Number(r.rows[0]!.id);
  await c.query('UPDATE qa_report SET ai_job_id = $1, ai = NULL WHERE id = $2', [id, 리포트.id]);
  return id;
}

/** 긴 배열을 상한에서 자른다. 잘렸으면 표시한다 */
export function 줄이기(v: unknown, 표: { 잘림: boolean }): unknown {
  if (Array.isArray(v)) {
    if (v.length > 배열상한) 표.잘림 = true;
    return v.slice(0, 배열상한).map((x) => 줄이기(x, 표));
  }
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, 줄이기(x, 표)]));
  return v;
}

/**
 * 가져간 일의 재료를 만들어 그 일의 input 에 굳힌다. 이 일을 가리키는 승인 전 버전이 없으면(다시 만들었거나 승인했다) 까닭을 낸다 —
 * 부르는 쪽이 일을 실패로 닫는다
 */
export async function 리스크재료(jobId: number, input: unknown): Promise<{ input: Record<string, unknown> } | { error: string }> {
  const projectReportId = (input as { projectReportId?: unknown } | null)?.projectReportId;
  if (typeof projectReportId === 'number') return 프로젝트리스크재료(jobId, projectReportId);
  const reportId = (input as { reportId?: unknown } | null)?.reportId;
  if (typeof reportId !== 'number') return { error: '리스크 일에 리포트 번호가 없습니다' };
  const pool = await db();
  const q = (
    await pool.query<{ version: number; env: string; build_no: string | null; summary: unknown; run_ids: string[]; service_name: string; prefix: string; project_id: string; bts: boolean }>(
      `SELECT q.version, q.env, q.build_no, q.summary, q.run_ids, q.service_name, s.prefix, s.project_id,
              EXISTS (SELECT 1 FROM bts_link l WHERE l.project_id = s.project_id) AS bts
         FROM qa_report q JOIN service s ON s.id = q.service_id
        WHERE q.id = $1 AND q.ai_job_id = $2 AND q.approved_at IS NULL`,
      [reportId, jobId],
    )
  ).rows[0];
  if (q === undefined) return { error: '이 일을 가리키는 승인 전 리포트가 없습니다 — 다시 만들었거나 승인했습니다' };
  const 안정화 = await 안정화읽기(pool, q.run_ids.map(Number), q.build_no);
  const 표 = { 잘림: false };
  const 재료 = {
    reportId,
    version: q.version,
    service: q.prefix,
    serviceName: q.service_name,
    projectId: Number(q.project_id),
    btsLinked: q.bts,
    env: q.env,
    buildNo: q.build_no,
    summary: 줄이기(q.summary, 표),
    // 이 빌드의 신규 · 증가 · 재발 오류 종류(종류별 구획 「안정화 · 오류 종류」와 같은 줄) — 웹 · 앱 · 게임만 있다
    stability: 안정화 === null ? null : { errors: 줄이기(안정화.errors, 표) },
    truncated: 표.잘림,
  };
  await pool.query('UPDATE perf_ai_job SET input = $2 WHERE id = $1', [jobId, JSON.stringify(재료)]);
  return { input: 재료 };
}

/**
 * 프로젝트 QA 리포트의 재료 — 이 리포트의 굳힌 숫자와 지난 프로젝트 리포트의 숫자 · 리스크 글. AI 는 둘을 견줘 새로 생기거나 바뀐 리스크를 쓴다 (§3.17 「프로젝트 QA 리포트」 AI 문단)
 * 사람이 이미 고쳤거나 다른 일을 가리키면 까닭을 낸다
 */
async function 프로젝트리스크재료(jobId: number, id: number): Promise<{ input: Record<string, unknown> } | { error: string }> {
  const pool = await db();
  type 줄 = { id: string; project_id: string | null; project_name: string; period_from: string; period_to: string; body: { btsLinked?: boolean; previous?: { id: number } | null }; ai: 리스크글저장 | null };
  const 읽기 = async (번호: number, 조건: string, 값: unknown[]) =>
    (
      await pool.query<줄>(
        `SELECT id, project_id, project_name, to_char(period_from, 'YYYY-MM-DD') AS period_from, to_char(period_to, 'YYYY-MM-DD') AS period_to, body, ai
           FROM qa_project_report WHERE id = $1 ${조건}`,
        [번호, ...값],
      )
    ).rows[0];
  const r = await 읽기(id, `AND ai_job_id = $2 AND (ai IS NULL OR ai->>'editedBy' IS NULL)`, [jobId]);
  if (r === undefined) return { error: '이 일을 가리키는 프로젝트 리포트가 없습니다 — 사람이 문단을 고쳤습니다' };
  const 앞번호 = r.body.previous?.id;
  const 앞 = 앞번호 === undefined ? undefined : await 읽기(앞번호, '', []);
  const 표 = { 잘림: false };
  const 재료 = {
    projectReportId: id,
    projectId: r.project_id === null ? null : Number(r.project_id),
    projectName: r.project_name,
    btsLinked: r.body.btsLinked === true,
    period: { from: r.period_from, to: r.period_to },
    body: 줄이기(r.body, 표),
    // 지난 리포트 — 견줄 숫자와 그때 쓴(사람이 고쳤으면 고친) 리스크 글
    previous: 앞 === undefined ? null : { id: Number(앞.id), period: { from: 앞.period_from, to: 앞.period_to }, body: 줄이기(앞.body, 표), risks: 앞.ai?.current ?? null },
    truncated: 표.잘림,
  };
  await pool.query('UPDATE perf_ai_job SET input = $2 WHERE id = $1', [jobId, JSON.stringify(재료)]);
  return { input: 재료 };
}

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
 * 일을 닫고 그 일을 가리키는 승인 전 버전에 처음 글을 쓴다 — 같은 트랜잭션이라 승인 통로가 「일은 끝났는데 글이 없다」를 못 본다.
 * 승인한 버전 · 다시 만들어 다른 일을 가리키는 버전 · 사람이 이미 쓴 글에는 쓰지 않는다 (§3.17 「승인과의 앞뒤」)
 */
export async function 리스크끝내기(jobId: number, 결과: 리스크결과 & { text: string }): Promise<boolean> {
  return 한트랜잭션(async (c) => {
    if (!(await (await 성능AI()).끝내기(jobId, { output: 결과 }, c))) return false;
    const 글: 리스크글저장 = { first: 결과.text, current: 결과.text, editedBy: null, editedAt: null };
    // 글이 바뀌면 문서도 바뀐다 — 다시 만든 때와 같이 updated_at 을 올려 승인이 그리는 사이 바뀐 것을 안다
    await c.query(
      `UPDATE qa_report SET ai = $2, updated_at = now() WHERE ai_job_id = $1 AND approved_at IS NULL AND (ai IS NULL OR ai->>'editedBy' IS NULL)`,
      [jobId, JSON.stringify(글)],
    );
    // 프로젝트 리포트도 같은 일 종류다 — 일 번호로 가리키는 줄에만 쓴다
    await c.query(`UPDATE qa_project_report SET ai = $2 WHERE ai_job_id = $1 AND (ai IS NULL OR ai->>'editedBy' IS NULL)`, [jobId, JSON.stringify(글)]);
    return true;
  });
}

export type 고친결과 = { ai: 리스크글저장 } | 'NOT_FOUND' | 'APPROVED';

/**
 * 사람이 문단을 고친다. 처음 글은 남기고 지금 글 · 고친 사람 · 시각을 바꾼다. AI 가 못 썼으면 처음 글은 빈 글이다.
 * 묶음 잠금 안에서 한다 — 승인이 PDF 를 굳히는 사이에 글이 바뀌면 승인 쪽이 updated_at 으로 알아챈다
 */
export async function 리스크고치기(id: number, text: string, 고친이: string): Promise<고친결과> {
  const pool = await db();
  const 열쇠 = (await pool.query<{ bundle_key: string }>('SELECT bundle_key FROM qa_report WHERE id = $1', [id])).rows[0]?.bundle_key;
  if (열쇠 === undefined) return 'NOT_FOUND';
  return 묶음잠금(pool, 열쇠, async (c) => {
    // 줄을 잠그고 읽는다 — 끝내기는 묶음 잠금 밖에서 돌아, 읽은 뒤 AI 처음 글이 들어오면 빈 처음 글로 덮게 된다
    const q = (
      await c.query<{ ai: 리스크글저장 | null; ai_job_id: string | null; approved: boolean }>(
        'SELECT ai, ai_job_id, approved_at IS NOT NULL AS approved FROM qa_report WHERE id = $1 FOR UPDATE',
        [id],
      )
    ).rows[0]!;
    if (q.approved) return 'APPROVED';
    const at = (await c.query<{ n: Date }>('SELECT now() AS n')).rows[0]!.n;
    const 글: 리스크글저장 = { first: q.ai?.first ?? '', current: text, editedBy: 고친이, editedAt: at.toISOString() };
    await c.query('UPDATE qa_report SET ai = $2, updated_at = now() WHERE id = $1', [id, JSON.stringify(글)]);
    // 아직 안 가져간 일은 닫는다 — 결과를 쓰지 않을 일이 승인을 막지 않게
    if (q.ai_job_id !== null) {
      await c.query(`UPDATE perf_ai_job SET status = 'FAILED', error = '사람이 문단을 고쳐 맡기지 않습니다', finished_at = now() WHERE id = $1 AND status = 'QUEUED'`, [q.ai_job_id]);
    }
    return { ai: 글 };
  });
}

/** 오래 쥔 일과, 꺼진 에이전트를 기다리는 리스크 일을 닫는다 — 리포트 보기 · 승인 때 부른다. 안 닫으면 승인이 AI_PENDING 에 묶인다 */
export async function 리스크일닫기(): Promise<void> {
  await (await 흐름일()).대기일닫기('REPORT_RISK', 대기닫기분);
}
