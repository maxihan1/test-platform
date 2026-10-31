// 프로젝트 노트를 고칠 사건을 쌓고, 열린 노트 고치기가 없으면 NOTE 하나를 세운다 (도메인/BTS 「맥락 — 프로젝트 노트」 「고치는 때」)

import type { Pool, PoolClient } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** project_note_event.kind CHECK 와 같다. 배포(DEPLOY)는 배포 신호(BTS-F5-01)가 쌓는다 */
export type 노트사건종류 = 'DEPLOY' | 'TASK_DONE' | 'ISSUE_OPEN' | 'ISSUE_CLOSE' | 'PR_MERGED' | 'PRD_VERSION' | 'AUTHORING_DONE';

/**
 * 열린 노트 고치기가 없으면 NOTE 를 세운다. 열린 줄이 있으면 그 줄이 집을 때 사건을 같이 받는다.
 * 사건 둘이 동시에 와도 줄이 둘 서지 않게 고유 색인(authoring_request_note_open)에 기댄다.
 * 「누가」는 BTS 연결을 마지막으로 저장한 admin 이다(도메인/BTS §3.12 「내 결정」 7)
 */
export async function 노트고치기세우기(projectId: number, 손?: PoolClient): Promise<void> {
  await (손 ?? (await db())).query(
    `INSERT INTO authoring_request (project_id, kind, params, requested_by, requested_by_name, status)
     SELECT l.project_id, 'NOTE', '{}'::jsonb, l.updated_by, 'BTS · ' || COALESCE(u.display_name, l.updated_by), 'PENDING'
       FROM bts_link l LEFT JOIN app_user u ON u.username = l.updated_by
      WHERE l.project_id = $1
     ON CONFLICT (project_id) WHERE project_id IS NOT NULL AND status IN ('PENDING', 'RUNNING') DO NOTHING`,
    [projectId],
  );
}

/**
 * BTS 를 이은 프로젝트에만 사건을 쌓는다 — 노트는 BTS 연동의 일이라 잇지 않은 프로젝트에 쌓으면 아무도 안 읽는 줄만 는다.
 * 쌓았으면 참. `손` 은 사건을 만든 쓰기와 같은 트랜잭션이다 — 판이 롤백되면 사건도 없어야 한다
 */
export async function 노트사건쌓기(projectId: number, kind: 노트사건종류, payload: object, 손?: PoolClient): Promise<boolean> {
  const 쓰는손 = 손 ?? (await db());
  const r = await 쓰는손.query(
    `INSERT INTO project_note_event (project_id, kind, payload)
     SELECT $1, $2, $3::jsonb WHERE EXISTS (SELECT 1 FROM bts_link WHERE project_id = $1)`,
    [projectId, kind, JSON.stringify(payload)],
  );
  if (r.rowCount !== 1) return false;
  await 노트고치기세우기(projectId, 손);
  return true;
}

/** 애플리케이션 번호로 쌓는다 — 판 · 작성 끝처럼 애플리케이션의 일이 낸 사건. payload 는 그 접두사로 짓는다 */
export async function 앱노트사건쌓기(
  서비스: number,
  kind: 노트사건종류,
  payload: (접두사: string) => object,
  손?: PoolClient,
): Promise<boolean> {
  const r = await (손 ?? (await db())).query<{ prefix: string; project_id: string | null }>('SELECT prefix, project_id FROM service WHERE id = $1', [서비스]);
  const 앱 = r.rows[0];
  if (앱 === undefined || 앱.project_id === null) return false;
  return 노트사건쌓기(Number(앱.project_id), kind, payload(앱.prefix), 손);
}

/** 그 애플리케이션의 프로젝트 번호. 없으면 null — 노트 고치기 줄이 그 애플리케이션과 같은 프로젝트인지 볼 때 쓴다 */
export async function 서비스프로젝트(서비스: number): Promise<number | null> {
  const r = await (await db()).query<{ project_id: string | null }>('SELECT project_id FROM service WHERE id = $1', [서비스]);
  const 값 = r.rows[0]?.project_id;
  return 값 === undefined || 값 === null ? null : Number(값);
}

/** 노트 고치기가 DONE 으로 끝난 뒤 — 도는 동안 들어온 사건 · 200건을 넘어 못 받은 사건이 남았으면 다음 노트 고치기를 세운다 */
export async function 남은사건있으면세우기(projectId: number): Promise<void> {
  const r = await (await db()).query('SELECT 1 FROM project_note_event WHERE project_id = $1 AND request_id IS NULL LIMIT 1', [projectId]);
  if ((r.rowCount ?? 0) > 0) await 노트고치기세우기(projectId);
}
