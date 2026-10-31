// 노트 고치기를 집을 때 싣는 note 칸 — 프로젝트 · 애플리케이션 · 지금 판 · 반영 안 된 사건 (도메인/BTS §7 「작성 에이전트 통로」 집기 note 칸)

import type { Pool } from 'pg';

import type { 노트문서 } from './note.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 한 번에 넘기는 사건 수. 넘은 것은 이 일이 끝난 뒤 다음 노트 고치기가 받는다 */
export const 사건상한 = 200;

export interface 노트집기칸 {
  project: { id: number; name: string; btsProject: string };
  services: { prefix: string; name: string; kind: string }[];
  current: { version: number; savedAt: string; docs: 노트문서[] } | null;
  events: { id: number; kind: string; payload: unknown; createdAt: string }[];
}

/** 프로젝트의 지금 판 — 받는 통로가 겹칠 앞 판도 이것이다 */
export async function 지금노트(projectId: number): Promise<{ version: number; savedAt: string; docs: 노트문서[] } | null> {
  const r = await (await db()).query<{ version: number; saved_at: Date; docs: 노트문서[] }>(
    'SELECT version, saved_at, docs FROM project_note WHERE project_id = $1 ORDER BY version DESC LIMIT 1',
    [projectId],
  );
  const 판 = r.rows[0];
  return 판 === undefined ? null : { version: 판.version, savedAt: 판.saved_at.toISOString(), docs: 판.docs };
}

/**
 * 반영 안 된 사건을 이 요청 번호로 묶어 돌려준다 — 아무도 안 받은 것 · 받은 일이 실패 · 중단으로 끝난 것 · 이 요청이 앞서 받은 것(집기를 되돌린 뒤 다시 집음).
 * 오래된 것부터. 집기가 이미 커밋된 뒤라 던지면 집기 통로가 줄로 되돌리고, 다음 집기가 같은 사건을 다시 받는다
 */
export async function 노트집기칸읽기(요청: { id: number; projectId: number }): Promise<노트집기칸> {
  const pool = await db();
  const 프로젝트 = (
    await pool.query<{ id: string; name: string; bts_project: string | null }>(
      'SELECT p.id, p.name, l.bts_project FROM project p LEFT JOIN bts_link l ON l.project_id = p.id WHERE p.id = $1',
      [요청.projectId],
    )
  ).rows[0];
  if (프로젝트 === undefined) throw new Error(`노트 고치기 ${String(요청.id)}번의 프로젝트 ${String(요청.projectId)} 가 없다`);
  const [앱들, current, 사건] = await Promise.all([
    pool.query<{ prefix: string; name: string; kind: string }>(
      'SELECT prefix, name, kind FROM service WHERE project_id = $1 AND is_active ORDER BY prefix',
      [요청.projectId],
    ),
    지금노트(요청.projectId),
    pool.query<{ id: string; kind: string; payload: unknown; created_at: Date }>(
      `UPDATE project_note_event e SET request_id = $2
         FROM (SELECT x.id FROM project_note_event x
                WHERE x.project_id = $1
                  AND (x.request_id IS NULL OR x.request_id = $2
                       OR EXISTS (SELECT 1 FROM authoring_request r WHERE r.id = x.request_id AND r.status IN ('FAILED', 'STOPPED')))
                ORDER BY x.id LIMIT $3) 고른
        WHERE e.id = 고른.id
      RETURNING e.id, e.kind, e.payload, e.created_at`,
      [요청.projectId, 요청.id, 사건상한],
    ),
  ]);
  return {
    // 연결을 끊었어도 이미 선 일은 돈다 — BTS 프로젝트 키만 빈다
    project: { id: Number(프로젝트.id), name: 프로젝트.name, btsProject: 프로젝트.bts_project ?? '' },
    services: 앱들.rows,
    current,
    // RETURNING 은 차례를 지키지 않는다
    events: 사건.rows
      .map((e) => ({ id: Number(e.id), kind: e.kind, payload: e.payload, createdAt: e.created_at.toISOString() }))
      .sort((a, b) => a.id - b.id),
  };
}
