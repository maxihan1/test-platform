// 작성 대기줄 표를 읽고 쓴다. 표 주인은 SPEC §6 이고 여기서는 상태 전이만 지킨다 (도메인/작성 §3.6)

import type { Pool } from 'pg';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. check:tests와 CI는 DB 없이 돌아야 하므로
// 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 종류 = 'AUTHOR' | 'RERUN' | 'MERGE';
export type 상태 = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

/**
 * 상태 전이는 이 둘뿐이다. 그 밖은 라우트가 409 로 거부한다.
 *
 * ```
 *   PENDING ──집기──▶ RUNNING ──끝내기──▶ DONE
 *      │                  │                FAILED
 *      └── 그 밖의 전이는 전부 409 ─────────┘
 * ```
 *
 * **이 표 하나가 셋을 닫는다** — 끝난 행에 「끝났다」가 또 와서 판정이 덮어써지는 것 ·
 * 집기가 `PENDING` 만 집으므로 `claimed_by` 가 덮어써질 일이 구조적으로 없는 것 ·
 * 머지가 아직 안 끝난 요청을 가리키는 것.
 */
export const 허용전이: Record<상태, 상태[]> = {
  PENDING: ['RUNNING'],
  RUNNING: ['DONE', 'FAILED'],
  DONE: [],
  FAILED: [],
};

export interface 요청 {
  id: number;
  serviceId: number;
  kind: 종류;
  sourceId: number | null;
  specText: string;
  params: Record<string, unknown>;
  requestedBy: string;
  requestedByName: string;
  claimedBy: string | null;
  status: 상태;
  stage: string | null;
  stageAt: string | null;
  result: unknown;
  testSource: unknown;
  screenshotDir: string | null;
  prUrl: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface 행 {
  id: string;
  service_id: string;
  kind: 종류;
  source_id: string | null;
  spec_text: string;
  params: Record<string, unknown>;
  requested_by: string;
  requested_by_name: string;
  claimed_by: string | null;
  status: 상태;
  stage: string | null;
  stage_at: Date | null;
  result: unknown;
  test_source: unknown;
  screenshot_dir: string | null;
  pr_url: string | null;
  error: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

// BIGSERIAL 은 pg 가 문자열로 준다. 화면과 라우트는 숫자로 다루므로 여기서 한 번만 바꾼다
function 빚기(r: 행): 요청 {
  return {
    id: Number(r.id),
    serviceId: Number(r.service_id),
    kind: r.kind,
    sourceId: r.source_id === null ? null : Number(r.source_id),
    specText: r.spec_text,
    params: r.params,
    requestedBy: r.requested_by,
    requestedByName: r.requested_by_name,
    claimedBy: r.claimed_by,
    status: r.status,
    stage: r.stage,
    stageAt: r.stage_at === null ? null : r.stage_at.toISOString(),
    result: r.result,
    testSource: r.test_source,
    screenshotDir: r.screenshot_dir,
    prUrl: r.pr_url,
    error: r.error,
    createdAt: r.created_at.toISOString(),
    startedAt: r.started_at === null ? null : r.started_at.toISOString(),
    finishedAt: r.finished_at === null ? null : r.finished_at.toISOString(),
  };
}

const 칸들 = `id, service_id, kind, source_id, spec_text, params, requested_by, requested_by_name,
              claimed_by, status, stage, stage_at, result, test_source, screenshot_dir, pr_url,
              error, created_at, started_at, finished_at`;

/**
 * 이 요청의 사진이 들어갈 폴더.
 *
 * **대기줄 행 번호로 가른다** (2026-09-22 결정). 러너는 `runs/{runId}/{historyId}` 로 가르는데
 * 머지 전 실행에는 그 행이 없다. 안 가르면 모든 요청이 같은 폴더에 겹쳐 쓰고 직전 요청 사진을 덮는다.
 */
export function 사진자리(id: number): string {
  return `authoring/${id}`;
}

export async function 줄세우기(입력: {
  서비스: number;
  kind: 종류;
  원본?: number | null;
  기획서: string;
  값?: Record<string, unknown>;
  누가: string;
  이름: string;
}): Promise<number> {
  const pool = await db();
  const r = await pool.query<{ id: string }>(
    `INSERT INTO authoring_request
       (service_id, kind, source_id, spec_text, params, requested_by, requested_by_name, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
     RETURNING id`,
    [
      입력.서비스,
      입력.kind,
      입력.원본 ?? null,
      입력.기획서,
      JSON.stringify(입력.값 ?? {}),
      입력.누가,
      입력.이름,
    ],
  );
  return Number(r.rows[0]!.id);
}

export async function 한건(id: number): Promise<요청 | null> {
  const pool = await db();
  const r = await pool.query<행>(`SELECT ${칸들} FROM authoring_request WHERE id = $1`, [id]);
  const row = r.rows[0];
  return row === undefined ? null : 빚기(row);
}

export async function 한쪽(입력: {
  서비스: number;
  상태?: 상태;
  쪽: number;
  크기?: number;
}): Promise<{ items: 요청[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const 크기 = 입력.크기 ?? 50;
  const 쪽 = Math.max(1, 입력.쪽);
  const 조건 = 입력.상태 === undefined ? '' : ' AND status = $2';
  const 값들: unknown[] = 입력.상태 === undefined ? [입력.서비스] : [입력.서비스, 입력.상태];

  const 셈 = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM authoring_request WHERE service_id = $1${조건}`,
    값들,
  );
  const r = await pool.query<행>(
    `SELECT ${칸들} FROM authoring_request
      WHERE service_id = $1${조건}
      ORDER BY id DESC
      LIMIT ${크기} OFFSET ${(쪽 - 1) * 크기}`,
    값들,
  );
  return {
    items: r.rows.map(빚기),
    total: Number(셈.rows[0]!.n),
    page: 쪽,
    pageSize: 크기,
  };
}

/**
 * 줄에서 한 건 집어 간다.
 *
 * **한 줄 UPDATE 가 곧 잠금이다.** `WHERE status = 'PENDING'` 이 붙은 한 문장이라
 * 둘이 동시에 불러도 하나만 바꾼다. **먼저 읽고 나중에 고치는 두 문장으로 쓰면 둘이 같은 행을 집는다.**
 *
 * **그 서비스 것만 집는다** — 안 거르면 남의 서비스 행을 집어 주고, 그 행에는
 * `spec_text` 가 기획서 본문 통째로 실려 있다 (도메인/작성 §7).
 */
export async function 집기(서비스: number, 집는이: string): Promise<요청 | null> {
  const pool = await db();
  const r = await pool.query<행>(
    `UPDATE authoring_request
        SET status = 'RUNNING', claimed_by = $2, started_at = now()
      WHERE id = (
              SELECT id FROM authoring_request
               WHERE service_id = $1 AND status = 'PENDING'
               ORDER BY id
               LIMIT 1
            )
        AND status = 'PENDING'
      RETURNING ${칸들}`,
    [서비스, 집는이],
  );
  const row = r.rows[0];
  return row === undefined ? null : 빚기(row);
}

/** 작업 단계를 올린다. 도는 중인 행에만 붙는다 — 아니면 false 를 주고 라우트가 409 를 낸다 */
export async function 단계올리기(id: number, 단계: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET stage = $2, stage_at = now()
      WHERE id = $1 AND status = 'RUNNING'`,
    [id, 단계],
  );
  return r.rowCount === 1;
}

/** 사진 폴더를 적어 둔다. 도는 중인 행에만 붙는다 */
export async function 사진자리적기(id: number, 자리: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET screenshot_dir = $2
      WHERE id = $1 AND status = 'RUNNING'`,
    [id, 자리],
  );
  return r.rowCount === 1;
}

/**
 * 끝났다고 알린다. **도는 중인 행에만 붙는다** — 끝난 행에 또 오면 false 다.
 * 안 막으면 판정과 PR 주소가 덮어써진다 (2026-09-22 검토가 잡았다).
 */
export async function 끝내기(
  id: number,
  결과: {
    status: 'DONE' | 'FAILED';
    result?: unknown;
    testSource?: unknown;
    prUrl?: string;
    error?: string;
  },
): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET status = $2,
            result = COALESCE($3::jsonb, result),
            test_source = COALESCE($4::jsonb, test_source),
            pr_url = COALESCE($5, pr_url),
            error = COALESCE($6, error),
            finished_at = now()
      WHERE id = $1 AND status = 'RUNNING'`,
    [
      id,
      결과.status,
      결과.result === undefined ? null : JSON.stringify(결과.result),
      결과.testSource === undefined ? null : JSON.stringify(결과.testSource),
      결과.prUrl ?? null,
      결과.error ?? null,
    ],
  );
  return r.rowCount === 1;
}
