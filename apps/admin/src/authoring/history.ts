// 작성 요청의 보이는 번호(뿌리)와 실행 기록 — DB 는 실행마다 행, 목록·상세는 뿌리 하나로 묶는다 (도메인/작성 §7 「실행 기록」)

import { db, 빚기, 칸들, type 상태, type 요청, type 행 } from './store.js';

/**
 * 뿌리들 → 그 뿌리의 모든 실행 행(`사슬(id, root_id)`). `WITH RECURSIVE` 안에 넣는다.
 * 새 데이터는 RERUN 의 원본이 늘 뿌리지만 2026-09-23 전 행에는 RERUN→RERUN 이 있고 머지는 실행 행을 가리킨다 —
 * 한 단계가 아니라 끝까지 따라 내려간다 (2026-09-29 계획 검토). 행마다 원본은 하나라 두 번 닿지 않는다
 */
export function 사슬식(뿌리조건: string): string {
  return `사슬(id, root_id) AS (
      SELECT id, id FROM authoring_request WHERE ${뿌리조건}
      UNION ALL
      SELECT a.id, 사슬.root_id FROM authoring_request a JOIN 사슬 ON a.source_id = 사슬.id WHERE a.kind <> 'AUTHOR'
    )`;
}

/** 실행 번호 → 뿌리 번호(`위`). 원본을 거슬러 AUTHOR 까지 — `WITH RECURSIVE` 안에 넣는다 */
export function 위로식(번호자리: string): string {
  return `위(id, source_id) AS (
      SELECT id, source_id FROM authoring_request WHERE id = ${번호자리}
      UNION ALL
      SELECT a.id, a.source_id FROM authoring_request a JOIN 위 ON a.id = 위.source_id
    )`;
}

export async function 뿌리(id: number): Promise<number | null> {
  const r = await (await db()).query<{ id: string }>(
    `WITH RECURSIVE ${위로식('$1')} SELECT id FROM 위 WHERE source_id IS NULL`,
    [id],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].id);
}

/** 한 실행의 기록 줄. 토큰은 그 실행이 쓴 것만 — 앞 실행 것을 더하지 않는다 (2026-09-29 사용자) */
export interface 실행 {
  id: number;
  kind: 요청['kind'];
  resumeFrom: number | null;
  status: 상태;
  stopReason: string | null;
  /** 첫 줄만 200자 — 긴 까닭은 그 실행 상세에서 본다 */
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  caseFiles: number | null;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number; partial: boolean } | null;
  prUrl: string | null;
}

interface 실행행 {
  id: string;
  kind: 요청['kind'];
  resume_from: string | null;
  status: 상태;
  stop_reason: string | null;
  error: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  progress: { caseFiles?: number } | null;
  // BIGINT 는 pg 가 문자열로 준다
  tokens_input: string | null;
  tokens_output: string | null;
  tokens_cache_read: string | null;
  tokens_cache_write: string | null;
  tokens_partial: boolean | null;
  pr_url: string | null;
}

/** 그 뿌리의 실행 전부, 최신 먼저 */
export async function 실행들(뿌리번호: number): Promise<실행[]> {
  const r = await (await db()).query<실행행>(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT a.id, a.kind, a.resume_from, a.status, a.stop_reason, a.error, a.created_at, a.started_at, a.finished_at,
            a.progress, a.tokens_input, a.tokens_output, a.tokens_cache_read, a.tokens_cache_write, a.tokens_partial, a.pr_url
       FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      ORDER BY a.id DESC`,
    [뿌리번호],
  );
  return r.rows.map((x) => ({
    id: Number(x.id),
    kind: x.kind,
    resumeFrom: x.resume_from === null ? null : Number(x.resume_from),
    status: x.status,
    stopReason: x.stop_reason,
    error: x.error === null ? null : (x.error.split('\n')[0] ?? '').slice(0, 200),
    createdAt: x.created_at.toISOString(),
    startedAt: x.started_at?.toISOString() ?? null,
    finishedAt: x.finished_at?.toISOString() ?? null,
    caseFiles: typeof x.progress?.caseFiles === 'number' ? x.progress.caseFiles : null,
    tokens:
      x.tokens_input === null
        ? null
        : {
            input: Number(x.tokens_input),
            output: Number(x.tokens_output ?? 0),
            cacheRead: Number(x.tokens_cache_read ?? 0),
            cacheWrite: Number(x.tokens_cache_write ?? 0),
            partial: x.tokens_partial === true,
          },
    prUrl: x.pr_url,
  }));
}

/** 그 뿌리의 실행 중 대기 · 작성 중인 것이 있나 — 둘이 돌면 같은 브랜치를 서로 덮는다 (2026-09-29 계획 검토) */
export async function 도는실행있나(뿌리번호: number): Promise<boolean> {
  const r = await (await db()).query(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT 1 FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id WHERE a.status IN ('PENDING', 'RUNNING') LIMIT 1`,
    [뿌리번호],
  );
  return (r.rowCount ?? 0) > 0;
}

/** 실패한 머지는 「최신」에서 뺀다 — 빼지 않으면 CI 가 빨갛게 끝난 머지 뒤에 다시 반영할 길이 없다 (2026-09-29 검사) */
export const 최신식 = (사슬이름: string) =>
  `(SELECT max(s.id) FROM ${사슬이름} s JOIN authoring_request x ON x.id = s.id WHERE NOT (x.kind = 'MERGE' AND x.status = 'FAILED'))`;

/** 그 뿌리의 가장 최근 실행 번호 — 실패한 머지는 건너뛴다 */
export async function 최신실행(뿌리번호: number): Promise<number> {
  const r = await (await db()).query<{ id: string }>(`WITH RECURSIVE ${사슬식('id = $1')} SELECT ${최신식('사슬')} AS id`, [
    뿌리번호,
  ]);
  return Number(r.rows[0]!.id);
}

/**
 * 뿌리 하나에 새 실행을 세우는 일을 한 줄로 — 확인(`도는실행있나`)과 넣기 사이에 다른 누름이 끼면
 * 둘이 같은 브랜치를 서로 덮는다 (2026-09-29 검사). 트랜잭션 잠금이라 끝나면 저절로 풀린다
 */
export async function 뿌리잠그고<T>(뿌리번호: number, 일: () => Promise<T>): Promise<T> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-root'), ($1::bigint % 2147483647)::int)`, [뿌리번호]);
    const 값 = await 일();
    await 손.query('COMMIT');
    return 값;
  } catch (e) {
    await 손.query('ROLLBACK');
    throw e;
  } finally {
    손.release();
  }
}

export type 요약 = Omit<요청, 'specText'> & { rootId: number; runCount: number };

const 요약칸들 = 칸들
  .replace('spec_text, ', '')
  .split(',')
  .map((칸) => `a.${칸.trim()}`)
  .join(', ');

/**
 * 목록 — 뿌리마다 한 줄. 그 줄은 **가장 최근 실행**의 상태를 싣고(거르기도 그것으로), 최근 실행 순으로 선다.
 * 폐기는 뿌리 통째로 찍히므로(`stop.ts`) 최근 실행의 폐기가 곧 요청의 폐기다
 */
export async function 한쪽(입력: {
  서비스: number;
  상태?: 상태;
  // 참이면 폐기한 것만, 아니면 폐기한 것을 뺀다
  폐기?: boolean;
  쪽: number;
  크기?: number;
}): Promise<{ items: 요약[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const 크기 = 입력.크기 ?? 50;
  // 쪽 번호가 무한대면 건너뛸 개수도 무한대가 되어 DB 가 해석 못 하는 값이 간다
  const 쪽 = Math.min(Math.max(1, Math.floor(입력.쪽) || 1), 1_000_000);
  const 조건 =
    (입력.폐기 === true ? 'discarded_at IS NOT NULL' : 'discarded_at IS NULL') +
    (입력.상태 === undefined ? '' : ' AND status = $2');
  const 값들: unknown[] = 입력.상태 === undefined ? [입력.서비스] : [입력.서비스, 입력.상태];
  const 최신 = `WITH RECURSIVE ${사슬식("service_id = $1 AND kind = 'AUTHOR'")},
    최신 AS (
      SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, count(*) OVER (PARTITION BY 사슬.root_id) AS run_count, ${요약칸들}
        FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
       ORDER BY 사슬.root_id, a.id DESC
    )`;

  const 셈 = await pool.query<{ n: string }>(`${최신} SELECT count(*) AS n FROM 최신 WHERE ${조건}`, 값들);
  // **건너뛸 개수를 질의문 글자에 끼워 넣지 않는다.** 지금은 숫자로 걸러지므로 주입은 아니지만,
  // 다음 사람이 여기에 문자열을 하나 더 얹으면 그때는 진짜 주입이 된다 (2026-09-22 보안 검토)
  const r = await pool.query<Omit<행, 'spec_text'> & { root_id: string; run_count: string }>(
    `${최신} SELECT * FROM 최신 WHERE ${조건}
      ORDER BY id DESC
      LIMIT $${값들.length + 1} OFFSET $${값들.length + 2}`,
    [...값들, 크기, (쪽 - 1) * 크기],
  );
  return {
    items: r.rows.map((x) => {
      const { specText: _본문, ...나머지 } = 빚기({ ...x, spec_text: null });
      return { ...나머지, rootId: Number(x.root_id), runCount: Number(x.run_count) };
    }),
    total: Number(셈.rows[0]!.n),
    page: 쪽,
    pageSize: 크기,
  };
}
