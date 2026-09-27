// 작성 대기줄 표를 읽고 쓴다. 표 주인은 SPEC §6 이고 여기서는 상태 전이만 지킨다 (도메인/작성 §3.6)

import type { Pool } from 'pg';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. check:tests와 CI는 DB 없이 돌아야 하므로
// 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
export async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 종류 = 'AUTHOR' | 'RERUN' | 'MERGE';
// DRAFT 는 자료를 올리는 중이라 아직 줄에 안 섰다. 줄에 세우기는 assetStore.ts 의 `제출` 이 한다
export type 상태 = 'DRAFT' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'STOPPED';

/**
 * 상태 전이는 셋뿐이다 (2026-09-23 에 `DRAFT→PENDING` 이 늘었다 — 자료를 다 올리기 전에는 줄에 안 선다).
 *
 * ```
 *   DRAFT ──줄에 세우기──▶ PENDING ──집기──▶ RUNNING ──끝내기──▶ DONE
 *                            │                  │                FAILED
 *                            └── 그 밖의 전이는 전부 409 ─────────┘
 * ```
 *
 * 줄에 세우기는 `assetStore.ts` 의 `제출` 이다.
 * **뒤의 둘이 셋을 닫는다** — 끝난 행에 「끝났다」가 또 와서 판정이 덮어써지는 것 ·
 * 집기가 `PENDING` 만 집으므로 `claimed_by` 가 덮어써질 일이 구조적으로 없는 것 ·
 * 머지가 아직 안 끝난 요청을 가리키는 것.
 *
 * **표로 따로 두지 않는다** (2026-09-22 검토가 잡았다). 실제 판정은 아래 UPDATE 넷의
 * `WHERE ... AND status = ...` 가 한다. 표를 또 만들면 **그것만 고치고 「닫았다」고 여기는**
 * 자리가 생기는데, 실제 동작은 하나도 안 바뀐다.
 */

export interface 요청 {
  id: number;
  serviceId: number;
  kind: 종류;
  sourceId: number | null;
  // 옛 행만 찬다. 2026-09-23 부터 기획서는 자료(authoring_asset)로 온다
  specText: string | null;
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
  // 역방향 칸 (§3.6). 계정은 여기 없다 — 대상 서버 줄에 있고 집기 응답에만 나간다
  compare: boolean;
  env: string | null;
  startUrl: string | null;
  // 중단·폐기 (§7 「중단 · 폐기 · 진척」). 목록에도 실린다 — 에이전트의 재시작 닫기가 목록의 stopRequestedAt 을 본다
  stopReason: string | null;
  stopRequestedAt: string | null;
  discardedAt: string | null;
}

export interface 행 {
  id: string;
  service_id: string;
  kind: 종류;
  source_id: string | null;
  spec_text: string | null;
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
  compare: boolean;
  env: string | null;
  start_url: string | null;
  stop_reason: string | null;
  stop_requested_at: Date | null;
  discarded_at: Date | null;
}

// BIGSERIAL 은 pg 가 문자열로 준다. 화면과 라우트는 숫자로 다루므로 여기서 한 번만 바꾼다
export function 빚기(r: 행): 요청 {
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
    compare: r.compare,
    env: r.env,
    startUrl: r.start_url,
    stopReason: r.stop_reason,
    stopRequestedAt: r.stop_requested_at?.toISOString() ?? null,
    discardedAt: r.discarded_at?.toISOString() ?? null,
  };
}

export const 칸들 = `id, service_id, kind, source_id, spec_text, params, requested_by, requested_by_name,
              claimed_by, status, stage, stage_at, result, test_source, screenshot_dir, pr_url,
              error, created_at, started_at, finished_at, compare, env, start_url,
              stop_reason, stop_requested_at, discarded_at`;

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
  // 옛 행 모양을 만드는 검사와 머지 행 자리표시만 채운다. 새 작성 요청은 자료로 온다
  기획서: string | null;
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

/**
 * 그 서비스의 테스트 저장소 주소. **병합될 PR 주소가 정말 그 저장소 것인지** 보는 데 쓴다.
 *
 * `catalog/store.ts` 의 `ServiceRow` 에는 이 칸이 없어 여기서 따로 읽는다 —
 * 그 타입을 넓히면 남의 컨텍스트 파일이 바뀐다.
 */
export async function 서비스저장소(서비스: number): Promise<string> {
  const pool = await db();
  const r = await pool.query<{ tests_repo: string }>(
    'SELECT tests_repo FROM service WHERE id = $1',
    [서비스],
  );
  return r.rows[0]?.tests_repo ?? '';
}

/**
 * 병합될 PR 주소로 받아들일 모양인가.
 *
 * **맥이 보낸 값을 그대로 믿으면 안 된다** (2026-09-22 보안 검토가 잡았다). 안 보면 둘이 난다 —
 * ⒜ **다른 저장소의 PR** 을 병합 대상으로 앉힐 수 있다 ⒝ 맥이 이 값을 명령줄에 끼워 넣으면
 * 따옴표·세미콜론 같은 글자가 **맥에서 임의 명령 실행**이 된다. 맥에는 사람의 GitHub 로그인이 살아 있다.
 *
 * **저장소 주소가 안 적힌 서비스는 통과시키지 않는다** — 대조할 기준이 없으면 「아무 주소나 좋다」가
 * 되어 ⒜ 가 그대로 살아난다. 설정 화면에서 저장소를 적으면 풀린다 (§8.8).
 */
export function 병합주소인가(주소: unknown, 저장소: string): boolean {
  if (typeof 주소 !== 'string' || 저장소 === '') return false;
  const 뿌리 = 저장소.replace(/\.git$/, '').replace(/\/$/, '');
  if (!뿌리.startsWith('https://')) return false;
  return new RegExp(`^${뿌리.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/pull/\\d{1,10}$`).test(주소);
}

/**
 * 그 서비스의 피그마 토큰. 없으면 null.
 *
 * **집기 라우트만 부른다.** 비밀값이라 설정 API 는 있는지만 알려 주고 값은 안 준다 (도메인/인증 §8.8).
 * 이 값이 서버 밖으로 나가는 길은 맥의 집기 응답 하나뿐이다.
 */
export async function 피그마토큰(서비스: number): Promise<string | null> {
  const pool = await db();
  const r = await pool.query<{ figma_token: string | null }>(
    'SELECT figma_token FROM service WHERE id = $1',
    [서비스],
  );
  const 값 = r.rows[0]?.figma_token ?? null;
  return 값 === '' ? null : 값;
}

export async function 한건(id: number): Promise<요청 | null> {
  const pool = await db();
  const r = await pool.query<행>(`SELECT ${칸들} FROM authoring_request WHERE id = $1`, [id]);
  const row = r.rows[0];
  return row === undefined ? null : 빚기(row);
}

/** 목록 한 줄. 기획서 본문은 싣지 않는다 — 목록은 본문을 안 그리고, 한 쪽에 50 건이면 본문 50 개가 실린다 */
export type 요약 = Omit<요청, 'specText'>;

const 요약칸들 = 칸들.replace('spec_text, ', '');

function 요약빚기(r: Omit<행, 'spec_text'>): 요약 {
  const { specText: _본문, ...나머지 } = 빚기({ ...r, spec_text: null });
  return 나머지;
}

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
    (입력.폐기 === true ? ' AND discarded_at IS NOT NULL' : ' AND discarded_at IS NULL') +
    (입력.상태 === undefined ? '' : ' AND status = $2');
  const 값들: unknown[] = 입력.상태 === undefined ? [입력.서비스] : [입력.서비스, 입력.상태];

  const 셈 = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM authoring_request WHERE service_id = $1${조건}`,
    값들,
  );
  // **건너뛸 개수를 질의문 글자에 끼워 넣지 않는다.** 지금은 숫자로 걸러지므로 주입은 아니지만,
  // 다음 사람이 여기에 문자열을 하나 더 얹으면 그때는 진짜 주입이 된다 (2026-09-22 보안 검토)
  const r = await pool.query<Omit<행, 'spec_text'>>(
    `SELECT ${요약칸들} FROM authoring_request
      WHERE service_id = $1${조건}
      ORDER BY id DESC
      LIMIT $${값들.length + 1} OFFSET $${값들.length + 2}`,
    [...값들, 크기, (쪽 - 1) * 크기],
  );
  return {
    items: r.rows.map(요약빚기),
    total: Number(셈.rows[0]!.n),
    page: 쪽,
    pageSize: 크기,
  };
}

// 에이전트가 부르는 쓰기(집기·단계·사진 자리·끝내기)는 agentStore.ts 로 뗐다 — 이 파일이 300줄을 넘었다. 부르는 쪽 import 는 그대로 둔다
export { 끝내기, 단계올리기, 사진자리적기, 집기, 집기되돌리기 } from './agentStore.js';
