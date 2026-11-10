// 프로젝트(애플리케이션을 묶는 폴더)를 읽고 만들고 이름을 바꾸는 곳 (SPEC 도메인/인증 §7 · 공통/4-데이터모델 「프로젝트 표」).
// 지우지 않는다 — 지난 실행이 가리키는 것을 흔들지 않는다

import { 작성계정이름 } from '../auth/agentToken.js';
import { db, 설정오류, 한묶음 } from './store.js';

export interface 프로젝트행 {
  id: number;
  name: string;
  /** 대표 애플리케이션. 다른 프로젝트로 옮겨 간 애플리케이션을 가리키면 null 이다 (공통/4-데이터모델 「대표 애플리케이션」) */
  primaryServiceId: number | null;
}

export async function 프로젝트목록(): Promise<프로젝트행[]> {
  const pool = await db();
  const rows = await pool.query<{ id: string; name: string; primary_service_id: string | null }>(
    `SELECT p.id, p.name, s.id AS primary_service_id
       FROM project p
       LEFT JOIN service s ON s.id = p.primary_service_id AND s.project_id = p.id
      ORDER BY p.name, p.id`,
  );
  // BIGSERIAL 은 pg 가 글자열로 준다. 경계에서 숫자로 바꾼다 (settings/store.ts 와 같은 규약)
  return rows.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    primaryServiceId: r.primary_service_id === null ? null : Number(r.primary_service_id),
  }));
}

/**
 * @param 만든이 요청한 운영 계정의 아이디. 있으면 그 프로젝트에 세 칸 쓰기로 배정한다 — 안 하면 방금 만든 프로젝트가
 *   그 사람의 고르개에 안 떠서 설정에서 자기를 따로 배정해야 한다 (도메인/인증 §3.5 「배정은 권한의 한 부분이다」)
 *
 * 작성 에이전트 계정(`AUTHORING_AGENT_USER`)도 같이 배정한다 — 빠지면 새 프로젝트의 작성 요청을 아무도 안 가져간다
 * (2026-10-25 GAME-F2-14 · Ashveil 시험에서 설정으로 돌아가 배정해야 했다)
 */
export async function 프로젝트만들기(name: string, 만든이?: string): Promise<number> {
  const 배정할것 = [만든이, 작성계정이름()].filter((u): u is string => u !== undefined && u !== null);
  return 한묶음(async (client) => {
    const rows = await client.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [name]);
    const id = Number(rows.rows[0]!.id);
    if (배정할것.length > 0) {
      await client.query(
        `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring)
              SELECT username, $2, 'write', 'write', 'write' FROM app_user WHERE username = ANY($1::text[])
         ON CONFLICT DO NOTHING`,
        [배정할것, id],
      );
    }
    return id;
  });
}

/** @param 대표 undefined 면 대표를 그대로 두고, null 이면 비운다 */
export async function 프로젝트고치기(id: number, name: string, 대표?: number | null): Promise<void> {
  const pool = await db();
  // 남의 프로젝트 · 없는 애플리케이션은 WHERE 에서 거른다 — 거르기 전에 칸을 쓰면 없는 번호가 외래 키 오류(500)로 샌다
  const rows = await pool.query(
    `UPDATE project SET name = $2, primary_service_id = CASE WHEN $4 THEN $3::bigint ELSE primary_service_id END
      WHERE id = $1 AND (NOT $4 OR $3::bigint IS NULL OR EXISTS (SELECT 1 FROM service WHERE id = $3 AND project_id = $1))`,
    [id, name, 대표 ?? null, 대표 !== undefined],
  );
  if (rows.rowCount !== 0) return;
  const 있나 = await pool.query('SELECT 1 FROM project WHERE id = $1', [id]);
  throw new 설정오류(있나.rowCount === 0 ? 'NOT_FOUND' : 'PRIMARY_NOT_IN_PROJECT');
}
