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
}

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
export async function lastByCase(): Promise<LastResult[]> {
  const pool = await db();
  const rows = await pool.query<{
    tc_id: string;
    platform: Platform;
    status: ItemStatus;
    history_id: string;
    run_id: string;
    duration_ms: number | null;
    finished_at: Date;
  }>(
    `SELECT DISTINCT ON (tc_id, platform) tc_id, platform, status, history_id, run_id, duration_ms, finished_at
       FROM run_item
      WHERE finished_at IS NOT NULL
      ORDER BY tc_id, platform, started_at DESC, history_id DESC`,
  );

  return rows.rows.map((row) => ({
    tcId: row.tc_id,
    platform: row.platform,
    status: row.status,
    historyId: Number(row.history_id),
    runId: Number(row.run_id),
    durationMs: row.duration_ms,
    finishedAt: row.finished_at.toISOString(),
  }));
}
