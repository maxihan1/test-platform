// 작성 요청의 보이는 번호(뿌리)와 실행 기록 — DB 는 실행마다 행, 목록·상세는 뿌리 하나로 묶는다 (도메인/작성 §7 「실행 기록」)

import type { PoolClient } from 'pg';

import { 사슬식, 최신식 } from './chainSql.js';
import { db, 빚기, 칸들, type 상태, type 요청, type 행 } from './store.js';
import { 밖화면뿌리 } from './params.js';
import { 목록요약들, type 목록요약 } from './listSummary.js';
import { 남은손들, 반영할일, 할일남았나, 할일없음, type 할일 } from './listTodo.js';

// 사슬 · 최신 SQL 은 chainSql.ts 로 옮겼다(집기가 가져오기 고리 없이 쓰게). 부르는 쪽 import 는 그대로 둔다
export { 사슬식, 최신식 };

/** 실행 번호 → 뿌리 번호(`위`). 원본을 거슬러 원본 없는 행(AUTHOR · EDIT)까지 — `WITH RECURSIVE` 안에 넣는다 */
export function 위로식(번호자리: string): string {
  return `위(id, source_id) AS (
      SELECT id, source_id FROM authoring_request WHERE id = ${번호자리}
      UNION ALL
      SELECT a.id, a.source_id FROM authoring_request a JOIN 위 ON a.id = 위.source_id
    )`;
}

/** 오류 글은 첫 줄만 200자 — 목록 · 알림 · Slack 이 같은 길이로 자른다. 긴 까닭은 그 실행 상세에서 본다 */
export const 오류첫줄 = (글: string): string => (글.split('\n')[0] ?? '').slice(0, 200);

export async function 뿌리(id: number, 손?: PoolClient): Promise<number | null> {
  const r = await (손 ?? (await db())).query<{ id: string }>(
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
    error: x.error === null ? null : 오류첫줄(x.error),
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
export async function 도는실행있나(뿌리번호: number, 손?: PoolClient): Promise<boolean> {
  const r = await (손 ?? (await db())).query(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT 1 FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id WHERE a.status IN ('PENDING', 'RUNNING') LIMIT 1`,
    [뿌리번호],
  );
  return (r.rowCount ?? 0) > 0;
}

/** 그 뿌리의 가장 최근 실행 번호 — 실패한 머지는 건너뛴다 */
export async function 최신실행(뿌리번호: number, 손?: PoolClient): Promise<number> {
  const r = await (손 ?? (await db())).query<{ id: string }>(`WITH RECURSIVE ${사슬식('id = $1')} SELECT ${최신식('사슬')} AS id`, [
    뿌리번호,
  ]);
  return Number(r.rows[0]!.id);
}

/**
 * 뿌리 하나에 새 실행을 세우는 일을 한 줄로 — 확인(`도는실행있나`)과 넣기 사이에 다른 누름이 끼면
 * 둘이 같은 브랜치를 서로 덮는다 (2026-09-29 검사). 트랜잭션 잠금이라 끝나면 저절로 풀린다.
 * `일` 은 잠금을 쥔 연결(`손`)을 받는다 — 잠금 안에서 풀 연결을 또 잡으면 동시 누름이 풀 크기를 넘길 때
 * 잠금을 쥔 쪽이 연결을 못 얻어 서버 전체가 선다(2026-09-30 보안 검토). 새 코드는 `손` 으로만 묻는다
 */
export async function 뿌리잠그고<T>(뿌리번호: number, 일: (손: PoolClient) => Promise<T>): Promise<T> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-root'), ($1::bigint % 2147483647)::int)`, [뿌리번호]);
    const 값 = await 일(손);
    await 손.query('COMMIT');
    return 값;
  } catch (e) {
    await 손.query('ROLLBACK');
    throw e;
  } finally {
    손.release();
  }
}

// rootKind — 줄의 kind 는 최신 실행 것이라 반영 · 다시 적용 뒤에는 뿌리가 작성인지 고치기인지 안 보인다 (§7 목록)
// summary · todo — 목록 줄 내용과 할 일 칩 (2026-10-26 WEB-F6-06 · 2026-10-19 ⑫ 점검 11.2)
export type 요약 = Omit<요청, 'specText'> & {
  rootId: number;
  runCount: number;
  rootKind: 요청['kind'];
  uncoveredOf: number | null;
  summary: 목록요약;
  todo: 할일;
};

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
  // 참이면 todo 가 하나라도 남은 뿌리만
  할일만?: boolean;
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
  // 뿌리는 원본이 없는 행 — 작성 요청과 케이스 고치기(EDIT). kind 로 고르면 고치기가 목록에서 빠진다.
  // 도는 것만 거를 때는 같은 프로젝트의 노트 고치기 뿌리도 싣는다 — 켤 때 멈춘 줄 닫기(scripts/authoring-closing.ts)가 이 목록으로 찾는다.
  // 화면은 상태로 거르지 않아 작성 목록에 노트 고치기가 안 보인다 (공통/4-데이터모델 「service_id 를 비우는 까닭」)
  const 노트도 = 입력.상태 === 'RUNNING' ? ' OR (service_id IS NULL AND project_id = (SELECT project_id FROM service WHERE id = $1))' : '';
  const 최신 = `WITH RECURSIVE ${사슬식(`(service_id = $1${노트도}) AND source_id IS NULL`)},
    최신 AS (
      SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, count(*) OVER (PARTITION BY 사슬.root_id) AS run_count,
             (SELECT r.continue_from FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_continue_from,
             (SELECT r.kind FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_kind,
             (SELECT r.params->'uncoveredOf' FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_uncovered_of, ${요약칸들}
        FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
       ORDER BY 사슬.root_id, a.id DESC
    )`;

  type 줄 = Omit<행, 'spec_text'> & { root_id: string; run_count: string; root_continue_from: string | null; root_kind: 요청['kind']; root_uncovered_of: unknown };
  let 줄들: 줄[];
  let 전체: number;
  let 할일들: Awaited<ReturnType<typeof 할일칸>>;
  if (입력.할일만 === true) {
    // ponytail: todo 는 보류 칸 모양까지 봐야 해서 SQL 로 못 거른다 — 서비스의 뿌리를 다 읽어 JS 로 거른 뒤 자른다. 뿌리가 수천을 넘으면 칸을 따로 둔다
    const 모두 = await pool.query<줄>(`${최신} SELECT * FROM 최신 WHERE ${조건} ORDER BY id DESC`, 값들);
    할일들 = await 할일칸(모두.rows);
    const 남은 = 모두.rows.filter((x) => 할일남았나(할일들(x)));
    전체 = 남은.length;
    줄들 = 남은.slice((쪽 - 1) * 크기, 쪽 * 크기);
  } else {
    const 셈 = await pool.query<{ n: string }>(`${최신} SELECT count(*) AS n FROM 최신 WHERE ${조건}`, 값들);
    전체 = Number(셈.rows[0]!.n);
    // **건너뛸 개수를 질의문 글자에 끼워 넣지 않는다.** 지금은 숫자로 걸러지므로 주입은 아니지만,
    // 다음 사람이 여기에 문자열을 하나 더 얹으면 그때는 진짜 주입이 된다 (2026-09-22 보안 검토)
    const r = await pool.query<줄>(
      `${최신} SELECT * FROM 최신 WHERE ${조건}
        ORDER BY id DESC
        LIMIT $${값들.length + 1} OFFSET $${값들.length + 2}`,
      [...값들, 크기, (쪽 - 1) * 크기],
    );
    줄들 = r.rows;
    할일들 = await 할일칸(줄들);
  }
  const 줄요약 = await 목록요약들(입력.서비스, 줄들.map((x) => Number(x.root_id)));
  return {
    items: 줄들.map((x) => {
      const { specText: _본문, ...나머지 } = 빚기({ ...x, spec_text: null });
      // 이어 작성은 뿌리(AUTHOR)에만 붙는다 — 줄의 다른 칸은 최신 실행 것이지만 이 칸은 뿌리 것을 싣는다
      const continueFrom = x.root_continue_from === null ? null : Number(x.root_continue_from);
      return {
        ...나머지,
        continueFrom,
        rootId: Number(x.root_id),
        runCount: Number(x.run_count),
        rootKind: x.root_kind,
        uncoveredOf: 밖화면뿌리(x.root_uncovered_of),
        // 줄은 모두 이 서비스의 살아 있는 뿌리라 요약이 늘 있다
        summary: 줄요약.get(Number(x.root_id))!,
        todo: 할일들(x),
      };
    }),
    total: 전체,
    page: 쪽,
    pageSize: 크기,
  };
}

type 할일줄 = { root_id: string; kind: 요청['kind']; status: 상태; discarded_at: Date | null };

/** 줄들의 할 일 — 폐기한 뿌리는 할 일이 없다 */
async function 할일칸(줄들: 할일줄[]): Promise<(x: 할일줄) => 할일> {
  const 손 = await 남은손들(줄들.filter((x) => x.discarded_at === null).map((x) => Number(x.root_id)));
  return (x) => (x.discarded_at !== null ? 할일없음 : { ...(손.get(Number(x.root_id)) ?? 할일없음), apply: 반영할일(x) });
}
