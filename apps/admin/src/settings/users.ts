// 계정을 만들고 고치는 곳 (SPEC §7 설정 API · §8.8). 서비스 쪽과 공용 도우미는 store.ts 에 있다
// 계정도 **지우지 않는다** — is_active 를 내릴 뿐이다

import type { PoolClient } from 'pg';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 무작위비밀번호, 해시 } from '../auth/password.js';
import { db, 설정오류, 한묶음 } from './store.js';

export type 계정등급 = 'member' | 'admin';
export type 권한 = 'none' | 'read' | 'write';
export type 대시보드권한 = 'none' | 'read';
/** 서비스 한 줄 = 접두사와 그 서비스에서의 권한 셋 (SPEC 도메인/인증 §7 「services[] 한 줄」) */
export interface 서비스권한 {
  prefix: string;
  permissions: { cases: 권한; runs: 권한; authoring: 권한 };
}

export interface 계정행 {
  username: string;
  displayName: string;
  role: 계정등급;
  dashboard: 대시보드권한;
  isActive: boolean;
  isApproved: boolean;
  mustChangePassword: boolean;
  services: 서비스권한[];
  /** 토큰 자체가 아니라 있는지만 (SPEC 도메인/인증 §7) */
  hasAgentToken: boolean;
  /** 화면이 토큰 칸을 그릴 계정인가 — 서버가 정한 작성 에이전트 계정 하나뿐이다 */
  isAuthoringAgent: boolean;
}

const 계정들 = `
  SELECT u.username, u.display_name, u.role, u.perm_dashboard, u.is_active, u.is_approved, u.must_change_password,
         u.agent_token_hash IS NOT NULL AS has_agent_token,
         COALESCE(
           json_agg(json_build_object(
             'prefix', s.prefix,
             'permissions', json_build_object('cases', us.perm_cases, 'runs', us.perm_runs, 'authoring', us.perm_authoring)
           ) ORDER BY s.prefix) FILTER (WHERE s.prefix IS NOT NULL),
           '[]') AS services
    FROM app_user u
    LEFT JOIN user_service us ON us.username = u.username
    LEFT JOIN service s ON s.id = us.service_id
   GROUP BY u.username
   ORDER BY u.username`;

export async function 계정목록(): Promise<계정행[]> {
  const pool = await db();
  const rows = await pool.query<{
    username: string;
    display_name: string;
    role: 계정등급;
    perm_dashboard: 대시보드권한;
    is_active: boolean;
    is_approved: boolean;
    must_change_password: boolean;
    has_agent_token: boolean;
    services: 서비스권한[];
  }>(계정들);
  return rows.rows.map((r) => ({
    username: r.username,
    displayName: r.display_name,
    role: r.role,
    dashboard: r.perm_dashboard,
    isActive: r.is_active,
    isApproved: r.is_approved,
    mustChangePassword: r.must_change_password,
    services: r.services,
    hasAgentToken: r.has_agent_token,
    isAuthoringAgent: 작성계정인가(r.username),
  }));
}

async function 배정바꾸기(client: PoolClient, username: string, 줄들: 서비스권한[]): Promise<void> {
  await client.query('DELETE FROM user_service WHERE username = $1', [username]);
  for (const { prefix, permissions: p } of 줄들) {
    await client.query(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
            SELECT $1, id, $3, $4, $5 FROM service WHERE prefix = $2
       ON CONFLICT DO NOTHING`,
      [username, prefix, p.cases, p.runs, p.authoring],
    );
  }
}

export interface 계정입력 {
  username: string;
  displayName: string;
  role: 계정등급;
  dashboard: 대시보드권한;
  services: 서비스권한[];
}

// 비밀번호는 요청에 싣지 않는다. 시스템이 만들어 응답에 한 번만 담고 그 뒤로는 아무 데서도 못 본다 (SPEC §7)
export async function 계정만들기(입력: 계정입력): Promise<string> {
  const 임시비밀번호 = 무작위비밀번호();
  const 해시값 = await 해시(임시비밀번호);

  await 한묶음(async (client) => {
    const rows = await client.query(
      // admin 이 만든 계정은 승인 대기를 거치지 않는다. 임시 비밀번호라 첫 로그인에 바꾸게 한다 (SPEC §3.5)
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $2, $3, $4, $5, true, true)
       ON CONFLICT (username) DO NOTHING`,
      [입력.username, 입력.displayName, 해시값, 입력.role, 입력.dashboard],
    );
    if (rows.rowCount === 0) throw new 설정오류('USERNAME_TAKEN');
    await 배정바꾸기(client, 입력.username, 입력.services);
  });

  return 임시비밀번호;
}

export interface 계정수정 {
  displayName?: string;
  role?: 계정등급;
  dashboard?: 대시보드권한;
  isActive?: boolean;
  services?: 서비스권한[];
}

export async function 계정고치기(username: string, 수정: 계정수정): Promise<void> {
  await 한묶음(async (client) => {
    const 지금 = await client.query<{ role: 계정등급; is_active: boolean; is_approved: boolean }>(
      'SELECT role, is_active, is_approved FROM app_user WHERE username = $1 FOR UPDATE',
      [username],
    );
    const 현재 = 지금.rows[0];
    if (현재 === undefined) throw new 설정오류('NOT_FOUND');

    const 내려간다 = (수정.role !== undefined && 수정.role !== 'admin') || 수정.isActive === false;
    if (현재.role === 'admin' && 현재.is_active && 현재.is_approved && 내려간다) {
      // 승인 대기 admin 은 설정 자리에 못 들어가니 세지 않는다 (SPEC 도메인/인증 §7)
      const 남은운영 = await client.query<{ count: string }>(
        `SELECT count(*) FROM app_user WHERE role = 'admin' AND is_active AND is_approved`,
      );
      // 막지 않으면 설정 자리에 아무도 못 들어가고 컨테이너 안에서 명령을 쳐야만 풀린다 (SPEC §7)
      if (Number(남은운영.rows[0]?.count ?? 0) <= 1) throw new 설정오류('LAST_ADMIN');
    }

    await client.query(
      `UPDATE app_user
          SET display_name = COALESCE($2, display_name),
              role         = COALESCE($3, role),
              is_active    = COALESCE($4, is_active),
              perm_dashboard = COALESCE($5, perm_dashboard)
        WHERE username = $1`,
      [username, 수정.displayName ?? null, 수정.role ?? null, 수정.isActive ?? null, 수정.dashboard ?? null],
    );
    if (수정.services !== undefined) await 배정바꾸기(client, username, 수정.services);
  });
}

export async function 비밀번호다시만들기(username: string): Promise<string> {
  const 임시비밀번호 = 무작위비밀번호();
  const pool = await db();
  // 임시 비밀번호를 넘겨받은 사람이 계속 쓰지 않게 다음 로그인에 바꾸게 한다 (SPEC 도메인/인증 §7)
  const rows = await pool.query('UPDATE app_user SET password_hash = $2, must_change_password = true WHERE username = $1', [
    username,
    await 해시(임시비밀번호),
  ]);
  if (rows.rowCount === 0) throw new 설정오류('NOT_FOUND');
  return 임시비밀번호;
}
