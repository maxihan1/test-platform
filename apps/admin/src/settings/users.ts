// 계정을 만들고 고치는 곳 (SPEC §7 설정 API · §8.8). 서비스 쪽과 공용 도우미는 store.ts 에 있다
// 계정도 **지우지 않는다** — is_active 를 내릴 뿐이다

import type { PoolClient } from 'pg';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 무작위비밀번호, 해시 } from '../auth/password.js';
import type { 등급 } from '../auth/store.js';

import { db, 설정오류, 한묶음 } from './store.js';

export interface 계정행 {
  username: string;
  displayName: string;
  role: 등급;
  isActive: boolean;
  services: string[];
  /** 토큰 자체가 아니라 있는지만 (SPEC 도메인/인증 §7) */
  hasAgentToken: boolean;
  /** 화면이 토큰 칸을 그릴 계정인가 — 서버가 정한 작성 에이전트 계정 하나뿐이다 */
  isAuthoringAgent: boolean;
}

const 계정들 = `
  SELECT u.username, u.display_name, u.role, u.is_active, u.agent_token_hash IS NOT NULL AS has_agent_token,
         COALESCE(json_agg(s.prefix ORDER BY s.prefix) FILTER (WHERE s.prefix IS NOT NULL), '[]') AS services
    FROM app_user u
    LEFT JOIN user_service us ON us.username = u.username
    LEFT JOIN service s ON s.id = us.service_id
   GROUP BY u.username, u.display_name, u.role, u.is_active, u.agent_token_hash
   ORDER BY u.username`;

export async function 계정목록(): Promise<계정행[]> {
  const pool = await db();
  const rows = await pool.query<{
    username: string;
    display_name: string;
    role: 등급;
    is_active: boolean;
    has_agent_token: boolean;
    services: string[];
  }>(계정들);
  return rows.rows.map((r) => ({
    username: r.username,
    displayName: r.display_name,
    role: r.role,
    isActive: r.is_active,
    services: r.services,
    hasAgentToken: r.has_agent_token,
    isAuthoringAgent: 작성계정인가(r.username),
  }));
}

async function 배정바꾸기(client: PoolClient, username: string, prefixes: string[]): Promise<void> {
  await client.query('DELETE FROM user_service WHERE username = $1', [username]);
  for (const prefix of prefixes) {
    await client.query(
      `INSERT INTO user_service (username, service_id)
            SELECT $1, id FROM service WHERE prefix = $2
       ON CONFLICT DO NOTHING`,
      [username, prefix],
    );
  }
}

export interface 계정입력 {
  username: string;
  displayName: string;
  role: 등급;
  services: string[];
}

// 비밀번호는 요청에 싣지 않는다. 시스템이 만들어 응답에 한 번만 담고 그 뒤로는 아무 데서도 못 본다 (SPEC §7)
export async function 계정만들기(입력: 계정입력): Promise<string> {
  const 임시비밀번호 = 무작위비밀번호();
  const 해시값 = await 해시(임시비밀번호);

  await 한묶음(async (client) => {
    const rows = await client.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [입력.username, 입력.displayName, 해시값, 입력.role],
    );
    if (rows.rowCount === 0) throw new 설정오류('USERNAME_TAKEN');
    await 배정바꾸기(client, 입력.username, 입력.services);
  });

  return 임시비밀번호;
}

export interface 계정수정 {
  displayName?: string;
  role?: 등급;
  isActive?: boolean;
  services?: string[];
}

export async function 계정고치기(username: string, 수정: 계정수정): Promise<void> {
  await 한묶음(async (client) => {
    const 지금 = await client.query<{ role: 등급; is_active: boolean }>(
      'SELECT role, is_active FROM app_user WHERE username = $1 FOR UPDATE',
      [username],
    );
    const 현재 = 지금.rows[0];
    if (현재 === undefined) throw new 설정오류('NOT_FOUND');

    const 내려간다 = (수정.role !== undefined && 수정.role !== 'admin') || 수정.isActive === false;
    if (현재.role === 'admin' && 현재.is_active && 내려간다) {
      const 남은운영 = await client.query<{ count: string }>(
        `SELECT count(*) FROM app_user WHERE role = 'admin' AND is_active`,
      );
      // 막지 않으면 설정 자리에 아무도 못 들어가고 컨테이너 안에서 명령을 쳐야만 풀린다 (SPEC §7)
      if (Number(남은운영.rows[0]?.count ?? 0) <= 1) throw new 설정오류('LAST_ADMIN');
    }

    await client.query(
      `UPDATE app_user
          SET display_name = COALESCE($2, display_name),
              role         = COALESCE($3, role),
              is_active    = COALESCE($4, is_active)
        WHERE username = $1`,
      [username, 수정.displayName ?? null, 수정.role ?? null, 수정.isActive ?? null],
    );
    if (수정.services !== undefined) await 배정바꾸기(client, username, 수정.services);
  });
}

export async function 비밀번호다시만들기(username: string): Promise<string> {
  const 임시비밀번호 = 무작위비밀번호();
  const pool = await db();
  const rows = await pool.query('UPDATE app_user SET password_hash = $2 WHERE username = $1', [
    username,
    await 해시(임시비밀번호),
  ]);
  if (rows.rowCount === 0) throw new 설정오류('NOT_FOUND');
  return 임시비밀번호;
}
