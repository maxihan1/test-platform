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

// 시나리오 실행은 카드가 없다 — 없는 실행으로 본다(reporting/routes.ts 실행상태 와 같다)
const 연결SQL = `
  SELECT r.service_id, r.env, l.base_url
    FROM test_run r JOIN service s ON s.id = r.service_id JOIN bts_link l ON l.project_id = s.project_id
   WHERE r.run_id = $1 AND r.kind <> 'SCENARIO'`;

const 줄SQL = `
  SELECT tc_id, kind, state, issue_key, last_error, COALESCE(run_id = $4, false) AS mine
    FROM bts_outbox
   WHERE service_id = $1 AND env = $2 AND tc_id = ANY($3) AND kind IN ('CREATE', 'COMMENT')
     AND (run_id = $4 OR (kind = 'CREATE' AND state = 'PENDING'))
   ORDER BY id DESC`;

const 짝SQL = `
  SELECT tc_id, issue_key, resolution, closed_at IS NULL AS open
    FROM bts_issue_case WHERE service_id = $1 AND env = $2 AND tc_id = ANY($3)`;

interface 줄행 {
  tc_id: string;
  kind: 'CREATE' | 'COMMENT';
  state: 'PENDING' | 'SENT' | 'GAVE_UP';
  issue_key: string | null;
  last_error: string | null;
  mine: boolean;
}

/**
 * BTS 를 안 이은 프로젝트면 null — 카드에 칸이 아예 없다. 이은 프로젝트에서 보일 것이 없는 케이스(흔들림으로 닫혀 안 올린 것)는 null 값.
 * 차례 — 이 실행의 등록(그만둔 것 빼고) · 댓글 > 다른 실행이 넣고 기다리는 등록 > 열린 이슈 > 이 실행의 그만둔 등록.
 * 그만둔 등록이 맨 뒤인 까닭 — 그사이 다른 실행이 같은 테스트를 올렸으면 그 이슈가 정본이라 [다시 보내기]를 보이면 이슈가 둘 된다.
 * 열린 이슈에 댓글만 단 실패는 그 이슈의 SENT 다 — 댓글 줄이 깨져도 카드에 안 띄운다
 */
export async function BTS카드칸들(runId: number, tcIds: string[]): Promise<Map<string, BTS카드칸 | null> | null> {
  const pool = await db();
  const 연결 = (await pool.query<{ service_id: string; env: string; base_url: string }>(연결SQL, [runId])).rows[0];
  if (연결 === undefined) return null;
  const 인자 = [연결.service_id, 연결.env, tcIds];
  const [줄들, 짝들] = await Promise.all([
    pool.query<줄행>(줄SQL, [...인자, runId]),
    pool.query<{ tc_id: string; issue_key: string; resolution: string | null; open: boolean }>(짝SQL, 인자),
  ]);
  const 바탕 = 연결.base_url.replace(/\/+$/, '');
  const 보냄 = (tcId: string, key: string): BTS카드칸 => ({
    issueKey: key,
    url: `${바탕}/issues/${encodeURIComponent(key)}`,
    state: 'SENT',
    reason: null,
    resolution: 짝들.rows.find((p) => p.tc_id === tcId && p.issue_key === key)?.resolution ?? null,
  });
  const 기다림: BTS카드칸 = { issueKey: null, url: null, state: 'SENDING', reason: null, resolution: null };
  const 칸들 = new Map<string, BTS카드칸 | null>();
  for (const tcId of tcIds) {
    const 내것 = 줄들.rows.filter((r) => r.tc_id === tcId && r.mine);
    const 내줄 = 내것.find((r) => r.kind === 'COMMENT' || r.state !== 'GAVE_UP');
    const 열린 = 짝들.rows.find((p) => p.tc_id === tcId && p.open);
    const 그만둔 = 내것.find((r) => r.kind === 'CREATE' && r.state === 'GAVE_UP');
    let 칸: BTS카드칸 | null = null;
    if (내줄 !== undefined && 내줄.kind === 'CREATE' && 내줄.state === 'PENDING') 칸 = 기다림;
    else if (내줄 !== undefined && 내줄.issue_key !== null) 칸 = 보냄(tcId, 내줄.issue_key);
    else if (줄들.rows.some((r) => r.tc_id === tcId && !r.mine)) 칸 = 기다림;
    else if (열린 !== undefined) 칸 = 보냄(tcId, 열린.issue_key);
    else if (그만둔 !== undefined) 칸 = { issueKey: null, url: null, state: 'GAVE_UP', reason: 그만둔.last_error, resolution: null };
    칸들.set(tcId, 칸);
  }
  return 칸들;
}

/**
 * 그만둔 등록을 처음부터(횟수 0) 다시 세운다. 그사이 같은 테스트의 다른 등록이 기다리거나 열린 이슈가 생겼으면 그대로 둔다 — 그것이 정본이다.
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
                            AND p.service_id = o.service_id AND p.tc_id = o.tc_id AND p.env = o.env)
          AND NOT EXISTS (SELECT 1 FROM bts_issue_case c WHERE c.closed_at IS NULL
                            AND c.service_id = o.service_id AND c.tc_id = o.tc_id AND c.env = o.env)`,
      [줄.id],
    );
  }
  return 'OK';
}
