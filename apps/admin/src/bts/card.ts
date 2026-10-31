// 실행 결과 실패 카드의 bts 칸 · [다시 보내기] — BTS 를 이은 프로젝트만 (도메인/BTS §7 · §8.15 「실행 결과 실패 카드」)

import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface BTS카드칸 {
  issueKey: string | null;
  url: string | null;
  state: 'SENT' | 'SENDING' | 'GAVE_UP';
  reason: string | null;
  resolution: string | null;
}

const 연결SQL = `
  SELECT r.service_id, r.env, l.base_url
    FROM test_run r JOIN service s ON s.id = r.service_id JOIN bts_link l ON l.project_id = s.project_id
   WHERE r.run_id = $1`;

// 케이스마다 한 줄 — 이 실행의 등록 > 이 실행의 댓글 > 앞 실행이 넣고 아직 기다리는 등록(같은 테스트의 실패는 그 등록으로 올린다)
const 줄SQL = `
  SELECT DISTINCT ON (o.tc_id) o.tc_id, o.kind, o.state, o.issue_key, o.last_error, c.resolution
    FROM bts_outbox o
    LEFT JOIN bts_issue_case c ON c.service_id = o.service_id AND c.tc_id = o.tc_id AND c.issue_key = o.issue_key
   WHERE o.service_id = $1 AND o.env = $2 AND o.tc_id = ANY($3)
     AND ((o.run_id = $4 AND o.kind IN ('CREATE', 'COMMENT')) OR (o.kind = 'CREATE' AND o.state = 'PENDING'))
   ORDER BY o.tc_id, o.run_id = $4 DESC, o.kind = 'CREATE' DESC, o.id DESC`;

/**
 * BTS 를 안 이은 프로젝트면 null — 카드에 칸이 아예 없다. 이은 프로젝트에서 보낼 줄이 없는 케이스(흔들림으로 닫혀 안 올린 것)는 null 값.
 * 열린 이슈에 댓글만 단 실패는 그 이슈의 SENT 다 — 댓글 줄이 깨져도 카드에 안 띄운다
 */
export async function BTS카드칸들(runId: number, tcIds: string[]): Promise<Map<string, BTS카드칸 | null> | null> {
  const pool = await db();
  const 연결 = (await pool.query<{ service_id: string; env: string; base_url: string }>(연결SQL, [runId])).rows[0];
  if (연결 === undefined) return null;
  const { rows } = await pool.query<{
    tc_id: string;
    kind: 'CREATE' | 'COMMENT';
    state: 'PENDING' | 'SENT' | 'GAVE_UP';
    issue_key: string | null;
    last_error: string | null;
    resolution: string | null;
  }>(줄SQL, [연결.service_id, 연결.env, tcIds, runId]);
  const 칸들 = new Map<string, BTS카드칸 | null>(tcIds.map((t) => [t, null]));
  for (const r of rows) {
    const state = r.kind === 'COMMENT' || r.state === 'SENT' ? 'SENT' : r.state === 'PENDING' ? 'SENDING' : 'GAVE_UP';
    칸들.set(r.tc_id, {
      issueKey: state === 'SENT' ? r.issue_key : null,
      url: state === 'SENT' && r.issue_key !== null ? `${연결.base_url}/issues/${encodeURIComponent(r.issue_key)}` : null,
      state,
      reason: state === 'GAVE_UP' ? r.last_error : null,
      resolution: state === 'SENT' ? r.resolution : null,
    });
  }
  return 칸들;
}

/**
 * 그만둔 등록을 처음부터(횟수 0) 다시 세운다. 그사이 같은 테스트의 다른 등록이 기다리고 있으면 그대로 둔다 — 그 등록이 올린다.
 * 보내는 중 · 보낸 등록은 할 일이 없어 그대로 202 다
 */
export async function BTS다시보내기(runId: number, tcId: string, env: string): Promise<'OK' | 'NOT_FOUND' | 'NOT_LINKED'> {
  const pool = await db();
  const 연결 = (await pool.query<{ service_id: string }>(연결SQL, [runId])).rows[0];
  if (연결 === undefined) return 'NOT_LINKED';
  const 줄 = (
    await pool.query<{ id: string; state: string }>(
      `SELECT id, state FROM bts_outbox WHERE run_id = $1 AND kind = 'CREATE' AND tc_id = $2 AND env = $3 ORDER BY id DESC LIMIT 1`,
      [runId, tcId, env],
    )
  ).rows[0];
  if (줄 === undefined) return 'NOT_FOUND';
  if (줄.state === 'GAVE_UP') {
    await pool.query(
      `UPDATE bts_outbox o SET state = 'PENDING', tries = 0, next_at = now(), last_error = NULL
        WHERE o.id = $1
          AND NOT EXISTS (SELECT 1 FROM bts_outbox p WHERE p.kind = 'CREATE' AND p.state = 'PENDING'
                            AND p.service_id = o.service_id AND p.tc_id = o.tc_id AND p.env = o.env)`,
      [줄.id],
    );
  }
  return 'OK';
}
