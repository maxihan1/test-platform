// 케이스(tcId) 축의 조회. 실행(run) 축은 queries.ts가 본다
// 같은 케이스가 환경별·실행별로 쌓이므로 (tc_id, platform, started_at DESC) 색인이 이 두 질의를 받친다 (SPEC §6)

import type { ItemStatus, Platform } from '@platform/kit';

import type { Pool } from 'pg';

export interface HistoryRow {
  historyId: number;
  runId: number;
  runTitle: string;
  platform: Platform;
  status: ItemStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface LastResult {
  tcId: string;
  platform: Platform;
  status: ItemStatus;
  historyId: number;
  runId: number;
  durationMs: number | null;
  finishedAt: string;
  /** 최근 판정, 새 것부터. 맨 앞은 늘 위 `status` 와 같다 (§8.1 흐름 막대) */
  recent: ItemStatus[];
}

/**
 * 목록 줄의 흐름 막대가 그리는 칸 수.
 *
 * 반복 실행의 기본값이 1회라(§8.2) 5회면 최근 다섯 번의 실행을 덮는다.
 * **바꾸려면 이 줄을 고친다** — 화면도 이 값을 읽는다. 숫자를 두 곳에 적지 않는다.
 */
export const 최근몇건 = 5;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

export async function caseHistory(
  tcId: string,
  platform: string | undefined,
  page: number,
  pageSize: number,
): Promise<{ items: HistoryRow[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const rows = await pool.query<{
    history_id: string;
    run_id: string;
    run_title: string;
    platform: Platform;
    status: ItemStatus;
    duration_ms: number | null;
    started_at: Date;
    finished_at: Date | null;
    total: number;
  }>(
    `SELECT i.history_id, i.run_id, r.title AS run_title, i.platform, i.status, i.duration_ms,
            i.started_at, i.finished_at, count(*) OVER ()::int AS total
       FROM run_item i JOIN test_run r ON r.run_id = i.run_id
      WHERE i.tc_id = $1 AND ($2::text IS NULL OR i.platform = $2)
      ORDER BY i.started_at DESC, i.history_id DESC
      LIMIT $3 OFFSET $4`,
    [tcId, platform ?? null, pageSize, (page - 1) * pageSize],
  );

  return {
    items: rows.rows.map((row) => ({
      historyId: Number(row.history_id),
      runId: Number(row.run_id),
      runTitle: row.run_title,
      platform: row.platform,
      status: row.status,
      durationMs: row.duration_ms,
      startedAt: row.started_at.toISOString(),
      finishedAt: iso(row.finished_at),
    })),
    total: rows.rows[0]?.total ?? 0,
    page,
    pageSize,
  };
}

// 케이스 목록의 '마지막 결과' 칸을 한 번에 채운다 (SPEC §8.1).
// 아직 안 끝난 항목은 판정이 아직 없으므로 마지막 결과가 아니다
export async function lastByCase(배정받은서비스: string[]): Promise<LastResult[]> {
  // 배정이 하나도 없으면 볼 것도 없다. 빈 목록으로 질의하면 ANY 가 전부 거짓이라
  // 같은 결과지만, 왕복을 아끼고 「전부 준다」로 오해될 여지를 없앤다
  if (배정받은서비스.length === 0) return [];

  const pool = await db();
  const rows = await pool.query<{
    tc_id: string;
    platform: Platform;
    status: ItemStatus;
    history_id: string;
    run_id: string;
    duration_ms: number | null;
    finished_at: Date;
    몇번째: string;
  }>(
    // 이 질의는 케이스 전체를 훑으므로 문(auth/gate.ts)이 막을 번호가 없다.
    // 서비스 경계를 여기서 직접 건다 — 안 걸면 남의 케이스 번호와 판정이 그대로 나간다 (§7)
    // test_case 에 서비스 칸이 없어 tc_id 접두사가 유일한 길이다 (§2 · §6)
    //
    // DISTINCT ON 을 창 함수로 바꿨다 (2026-09-21). 배지는 여전히 1번 줄 하나이고,
    // 흐름 막대가 쓰는 나머지 넷이 같은 왕복에 실려 온다 — 케이스마다 이력을 따로 부르지 않는다 (§8.1)
    `SELECT tc_id, platform, status, history_id, run_id, duration_ms, finished_at, 몇번째
       FROM (
         SELECT tc_id, platform, status, history_id, run_id, duration_ms, finished_at,
                ROW_NUMBER() OVER (PARTITION BY tc_id, platform
                                       ORDER BY started_at DESC, history_id DESC) AS 몇번째
           FROM run_item
          WHERE finished_at IS NOT NULL
            AND split_part(tc_id, '-', 1) = ANY($1)
       ) 줄세운것
      WHERE 몇번째 <= $2
      ORDER BY tc_id, platform, 몇번째`,
    [배정받은서비스, 최근몇건],
  );

  // 같은 (케이스, 디바이스) 가 최대 다섯 줄로 온다. 1번 줄이 배지이고 나머지는 흐름이다
  const 모음 = new Map<string, LastResult>();
  for (const row of rows.rows) {
    const 열쇠 = `${row.tc_id}\u0000${row.platform}`;
    const 이미 = 모음.get(열쇠);
    if (이미 === undefined) {
      모음.set(열쇠, {
        tcId: row.tc_id,
        platform: row.platform,
        status: row.status,
        historyId: Number(row.history_id),
        runId: Number(row.run_id),
        durationMs: row.duration_ms,
        finishedAt: row.finished_at.toISOString(),
        recent: [row.status],
      });
      continue;
    }
    이미.recent.push(row.status);
  }

  return [...모음.values()];
}
