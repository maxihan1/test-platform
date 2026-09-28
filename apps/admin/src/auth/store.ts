// 계정과 배정 서비스를 DB에서 읽어 오는 곳. 여기까지가 「누구인지 알아내는 부분」이다 (SPEC §3.5)

import type { Pool } from 'pg';

import { 관리자권한, 관리자대시보드, type 대시보드칸, type 서비스권한 } from './permissions.js';

export type 등급 = 'member' | 'admin';

export interface 대상서버 {
  env: string;
  baseUrl: string;
}

export interface 배정서비스 {
  id: number;
  prefix: string;
  name: string;
  color: string;
  /**
   * 그 서비스의 대상 서버 목록 (SPEC §6 `service_env`).
   *
   * 실행 설정의 드롭다운이 읽는다 (§8.2). **화면이 이 값을 받을 통로가 여기뿐이다** —
   * `/api/settings/**` 는 운영 등급만이라 실행까지 등급이 거기서 403 을 받는다.
   */
  envs: 대상서버[];
  /**
   * Slack 칸을 그릴지 말지 (SPEC §8.2 · §8.9).
   *
   * **주소 자체는 담지 않는다.** 설정됐는지만 준다 — 설정 API 와 같은 규칙이다 (§7).
   */
  hasSlackWebhook: boolean;
  /** 케이스 폴더 이름 (SPEC §6 `service.tests_dir`) */
  testsDir: string;
  /** 이 서비스에서 기능마다 가진 칸. admin 은 저장값과 상관없이 전부 `write` (SPEC §3.5 · §7) */
  permissions: 서비스권한;
}

export interface 사용자 {
  username: string;
  displayName: string;
  role: 등급;
  dashboard: 대시보드칸;
  mustChangePassword: boolean;
  services: 배정서비스[];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 비활성 계정은 없는 것으로 친다. 로그인도 세션 확인도 같은 문에서 막혀야
// 「계정이 있는지」가 밖에서 드러나지 않는다 (SPEC §7)
// 대상 서버는 서비스마다 여러 줄이라 먼저 접어 두고 붙인다.
// 바깥에서 LEFT JOIN 하면 서비스 × 대상 서버만큼 행이 불어나 json_agg 가 중복을 만든다
const 한사람 = `
  WITH 서버 AS (
    SELECT service_id,
           json_agg(json_build_object('env', env, 'baseUrl', base_url) ORDER BY env) AS envs
      FROM service_env
     GROUP BY service_id
  )
  SELECT u.display_name, u.role, u.password_hash, u.perm_dashboard, u.must_change_password,
         COALESCE(
           json_agg(json_build_object(
             'id', s.id, 'prefix', s.prefix, 'name', s.name, 'color', s.color,
             'envs', COALESCE(e.envs, '[]'::json),
             'testsDir', s.tests_dir,
             -- 칸은 이름을 짚어 담는다. row_to_json 으로 통째로 넣으면 표에 칸이 늘 때 응답이 말없이 불어난다
             'permissions', json_build_object(
               'cases', us.perm_cases, 'runs', us.perm_runs, 'authoring', us.perm_authoring),
             -- 주소가 아니라 있는지만 낸다 (SPEC §7)
             'hasSlackWebhook', s.slack_webhook IS NOT NULL AND s.slack_webhook <> ''
           ) ORDER BY s.prefix) FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS services
    FROM app_user u
    LEFT JOIN user_service us ON us.username = u.username
    LEFT JOIN service s ON s.id = us.service_id AND s.is_active
    LEFT JOIN 서버 e ON e.service_id = s.id
   WHERE u.username = $1 AND u.is_active
   GROUP BY u.username, u.display_name, u.role, u.password_hash, u.perm_dashboard, u.must_change_password`;

interface 한사람행 {
  display_name: string;
  role: 등급;
  password_hash: string;
  perm_dashboard: 대시보드칸;
  must_change_password: boolean;
  services: 배정서비스[];
}

export async function 사용자와해시(
  username: string,
): Promise<{ user: 사용자; passwordHash: string } | null> {
  const pool = await db();
  const rows = await pool.query<한사람행>(한사람, [username]);
  const row = rows.rows[0];
  if (row === undefined) return null;
  // admin 채우기는 SQL 이 아니라 여기서 한다 — 저장값을 덮는 규칙이 한 자리에 보여야 한다
  const 관리자 = row.role === 'admin';

  return {
    user: {
      username,
      displayName: row.display_name,
      role: row.role,
      dashboard: 관리자 ? 관리자대시보드 : row.perm_dashboard,
      mustChangePassword: row.must_change_password,
      // 비활성 서비스는 띠의 목록에서 사라진다. 과거 실행 기록은 그대로 남는다 (SPEC §8.8)
      services: 관리자 ? row.services.map((s) => ({ ...s, permissions: { ...관리자권한 } })) : row.services,
    },
    passwordHash: row.password_hash,
  };
}
