// 계정과 배정 서비스를 DB에서 읽어 오는 곳. 여기까지가 「누구인지 알아내는 부분」이다 (SPEC §3.5)

import type { Pool } from 'pg';

export type 등급 = 'viewer' | 'operator' | 'admin';

export interface 배정서비스 {
  id: number;
  prefix: string;
  name: string;
  color: string;
}

export interface 사용자 {
  username: string;
  displayName: string;
  role: 등급;
  services: 배정서비스[];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 비활성 계정은 없는 것으로 친다. 로그인도 세션 확인도 같은 문에서 막혀야
// 「계정이 있는지」가 밖에서 드러나지 않는다 (SPEC §7)
const 한사람 = `
  SELECT u.display_name, u.role, u.password_hash,
         COALESCE(
           json_agg(json_build_object('id', s.id, 'prefix', s.prefix, 'name', s.name, 'color', s.color)
                    ORDER BY s.prefix) FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS services
    FROM app_user u
    LEFT JOIN user_service us ON us.username = u.username
    LEFT JOIN service s ON s.id = us.service_id AND s.is_active
   WHERE u.username = $1 AND u.is_active
   GROUP BY u.username, u.display_name, u.role, u.password_hash`;

interface 한사람행 {
  display_name: string;
  role: 등급;
  password_hash: string;
  services: 배정서비스[];
}

export async function 사용자와해시(
  username: string,
): Promise<{ user: 사용자; passwordHash: string } | null> {
  const pool = await db();
  const rows = await pool.query<한사람행>(한사람, [username]);
  const row = rows.rows[0];
  if (row === undefined) return null;

  return {
    user: {
      username,
      displayName: row.display_name,
      role: row.role,
      // 비활성 서비스는 띠의 목록에서 사라진다. 과거 실행 기록은 그대로 남는다 (SPEC §8.8)
      services: row.services,
    },
    passwordHash: row.password_hash,
  };
}
