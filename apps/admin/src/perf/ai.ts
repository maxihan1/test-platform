// 성능 AI 일 — 결과 모양 검사 · 동시 사용자 계산 · 일 표 읽고 쓰기 (도메인/성능 §7 「AI 일」 · PERF-F1-04)

import type { PoolClient } from 'pg';
import { z } from 'zod';

import { 페이지 } from './pages.js';
import { 목표, 트랜잭션 } from './scenarios.js';
import { 풀 } from './store.js';

export type AI일종류 = 'DRAFT_RECORD' | 'DRAFT_SWAGGER' | 'DRAFT_FILE' | 'SUGGEST_LOAD' | 'SUGGEST_TARGETS' | 'SUGGEST_PAGES' | 'ANALYZE_RUN';

// 피크 시간은 1시간으로 둔다 (PERF-F1-04 시작 질문). 스트레스 테스트의 최대는 피크의 5배가 기본이다 (§3.9 「부하 설정」)
export const 피크분 = 60;
export const 스트레스배수 = 5;
// 작성 에이전트가 집고 이만큼 끝내지 않으면 실패로 닫는다 (PERF-F1-04 시작 질문)
export const 일제한분 = 20;

const 트랜잭션목록 = z.array(트랜잭션).min(1).max(200)
  .refine((txs) => new Set(txs.map((t) => t.name)).size === txs.length, '트랜잭션 이름이 겹칩니다');
const 설명 = z.record(z.string().max(100), z.string().max(2000)).default({});
const 근거 = z.array(z.string().max(500)).max(30).default([]);

const 출력: Record<AI일종류, z.ZodType> = {
  DRAFT_RECORD: z.object({
    transactions: 트랜잭션목록,
    excluded: z.array(z.object({ url: z.string().max(2000), reason: z.string().max(500) })).max(1000).default([]),
    notes: 설명,
  }),
  DRAFT_SWAGGER: z.object({ transactions: 트랜잭션목록, notes: 설명 }),
  DRAFT_FILE: z.object({
    transactions: 트랜잭션목록,
    unconverted: z.array(z.object({ what: z.string().max(500), why: z.string().max(1000) })).max(200).default([]),
    notes: 설명,
  }),
  SUGGEST_LOAD: z.object({
    dailyVisitors: z.number().min(0).nullable(),
    peakRatio: z.number().min(0).max(1).nullable(),
    avgStayMin: z.number().min(0).nullable(),
    reqIds: z.array(z.string().max(50)).max(50).default([]),
    basis: 근거,
  }),
  SUGGEST_TARGETS: z.object({
    // 직접 입력은 사람이 고칠 때만 붙는 꼬리표다. 기획서 근거는 요구 번호를 든다 (§3.9 「성능 목표」)
    targets: z.array(목표.refine((t) => t.source !== 'MANUAL' && (t.source !== 'PRD' || t.reqId !== undefined), '근거 꼬리표가 틀렸습니다')).min(1).max(50),
    basis: 근거,
  }),
  // 화면 기록에서 고른 주요 페이지 (§3.9 「잴 페이지」). 저장 · 측정과 같은 검사다
  SUGGEST_PAGES: z.object({
    pages: z.array(페이지.extend({ why: z.string().max(500).default('') })).min(1).max(10)
      .refine((ps) => new Set(ps.map((p) => p.url)).size === ps.length, '경로가 겹칩니다'),
    basis: 근거,
  }),
  // 결과 화면 「AI 분석」 — 제목 한 줄과 개조식 항목. perf_run.ai 에 그대로 쓰고 PDF 가 같은 꼴로 읽는다.
  // 페이지 단독 측정은 페이지별 항목(pages)을 더 낸다 — 화면 워터폴 아래 「AI 분석」
  ANALYZE_RUN: z.object({
    title: z.string().trim().min(1).max(200),
    items: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
    pages: z.array(z.object({ url: z.string().min(1).max(500), items: z.array(z.string().trim().min(1).max(500)).min(1).max(5) })).max(10).optional(),
  }),
};

/** 피크 동시 사용자 = 일 방문자 × 피크 집중률 × 평균 체류 시간(분) ÷ 피크 시간(분). 셋 중 하나라도 없으면 null — 화면이 묻는다 */
export function 피크동시사용자(일방문자: number | null, 집중률: number | null, 체류분: number | null): number | null {
  if (일방문자 === null || 집중률 === null || 체류분 === null) return null;
  return Math.ceil((일방문자 * 집중률 * 체류분) / 피크분);
}

/** 모양이 맞으면 admin 이 센 칸을 붙인 결과, 틀리면 까닭 */
export function 결과다듬기(kind: string, input: unknown, output: unknown): { output: Record<string, unknown> } | { error: string } {
  const 모양 = 출력[kind as AI일종류];
  if (모양 === undefined) return { error: `모르는 일 종류다: ${kind}` };
  const p = 모양.safeParse(output);
  if (!p.success) return { error: `결과 모양이 틀렸습니다: ${p.error.message.slice(0, 1500)}` };
  const 값 = p.data as Record<string, unknown>;
  if (kind === 'SUGGEST_LOAD') {
    const v = 값 as { dailyVisitors: number | null; peakRatio: number | null; avgStayMin: number | null };
    const 피크 = 피크동시사용자(v.dailyVisitors, v.peakRatio, v.avgStayMin);
    return { output: { ...값, peakMinutes: 피크분, peakVus: 피크, maxVus: 피크 === null ? null : 피크 * 스트레스배수 } };
  }
  if (kind === 'DRAFT_RECORD') {
    // 화면 AI 줄 「녹화 요청 23건 중 API 6건 사용 · 정적 리소스 17건 제외」의 숫자는 admin 이 센다
    const 재료 = input as { total?: number; staticExcluded?: number };
    const v = 값 as { transactions: unknown[]; excluded: unknown[] };
    return { output: { ...값, recorded: { total: 재료.total ?? 0, staticExcluded: 재료.staticExcluded ?? 0, used: v.transactions.length, excluded: v.excluded.length } } };
  }
  return { output: 값 };
}

/** 녹화 중인 일 — admin 이 다시 켜지면 이 목록이 비어 그 일들을 실패로 닫는다 */
export const 녹화중 = new Set<number>();

/** 작성 에이전트가 집고 오래 쥔 일과, admin 이 다시 켜져 끊긴 녹화를 실패로 닫는다 */
export async function 오래된일닫기(): Promise<void> {
  const pool = await 풀();
  await pool.query(
    `UPDATE perf_ai_job SET status = 'FAILED', error = $1, finished_at = now()
      WHERE status = 'RUNNING' AND claimed_at < now() - make_interval(mins => $2)`,
    [`작성 에이전트가 ${일제한분}분 안에 끝내지 못했습니다`, 일제한분],
  );
  // 막 만든 녹화 일은 번호를 목록에 넣기 전일 수 있어 1분은 기다린다
  await pool.query(
    `UPDATE perf_ai_job SET status = 'FAILED', error = '녹화가 끊겼습니다 — admin 이 다시 켜졌습니다', finished_at = now()
      WHERE status = 'RUNNING' AND claimed_at IS NULL AND created_at < now() - interval '1 minute' AND NOT (id = ANY($1::bigint[]))`,
    [[...녹화중]],
  );
}

export async function 일만들기(kind: AI일종류, serviceId: number, input: unknown, who: string, 녹화 = false, runId: number | null = null): Promise<number> {
  // 녹화를 기다리는 일은 집히지 않게 RUNNING(집은 시각 없음)으로 둔다 — 녹화가 끝나면 QUEUED 로 바꾼다
  const r = await (await 풀()).query<{ id: string }>(
    'INSERT INTO perf_ai_job (kind, service_id, input, status, created_by, run_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [kind, serviceId, JSON.stringify(input), 녹화 ? 'RUNNING' : 'QUEUED', who, runId],
  );
  return Number(r.rows[0]?.id);
}

export async function 녹화끝(jobId: number, 결과: { input: unknown } | { error: string }): Promise<void> {
  if ('error' in 결과) {
    await (await 풀()).query(`UPDATE perf_ai_job SET status = 'FAILED', error = $2, finished_at = now() WHERE id = $1 AND status = 'RUNNING' AND claimed_at IS NULL`, [jobId, 결과.error.slice(0, 2000)]);
    return;
  }
  await (await 풀()).query(`UPDATE perf_ai_job SET status = 'QUEUED', input = $2 WHERE id = $1 AND status = 'RUNNING' AND claimed_at IS NULL`, [jobId, JSON.stringify(결과.input)]);
}

/** 그 애플리케이션들의 가장 오래된 대기 일 하나를 집는다 */
export async function 집기(접두사들: string[]): Promise<{ id: number; kind: string; input: unknown } | null> {
  const r = await (await 풀()).query<{ id: string; kind: string; input: unknown }>(
    `UPDATE perf_ai_job SET status = 'RUNNING', claimed_at = now()
      WHERE id = (SELECT j.id FROM perf_ai_job j JOIN service s ON s.id = j.service_id
                   WHERE j.status = 'QUEUED' AND s.prefix = ANY($1::text[])
                   ORDER BY j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED)
      RETURNING id, kind, input`,
    [접두사들],
  );
  const row = r.rows[0];
  return row === undefined ? null : { id: Number(row.id), kind: row.kind, input: row.input };
}

/** 집힌 일만 끝낸다. 끝났거나 집히지 않은 일이면 false. 손을 주면 그 연결(트랜잭션)에서 한다 */
export async function 끝내기(id: number, 결과: { output: unknown } | { error: string }, 손?: Pick<PoolClient, 'query'>): Promise<boolean> {
  const r = await (손 ?? (await 풀())).query(
    `UPDATE perf_ai_job SET status = $2, output = $3, error = $4, finished_at = now()
      WHERE id = $1 AND status = 'RUNNING' AND claimed_at IS NOT NULL`,
    'error' in 결과 ? [id, 'FAILED', null, 결과.error.slice(0, 2000)] : [id, 'DONE', JSON.stringify(결과.output), null],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function 일하나(id: number): Promise<{ kind: string; serviceId: number; runId: number | null; status: string; input: unknown; output: unknown; error: string | null } | null> {
  const r = await (await 풀()).query<{ kind: string; service_id: string; run_id: string | null; status: string; input: unknown; output: unknown; error: string | null }>(
    'SELECT kind, service_id, run_id, status, input, output, error FROM perf_ai_job WHERE id = $1',
    [id],
  );
  const row = r.rows[0];
  return row === undefined ? null : { kind: row.kind, serviceId: Number(row.service_id), runId: row.run_id === null ? null : Number(row.run_id), status: row.status, input: row.input, output: row.output, error: row.error };
}
