// 계정 보류 읽기 — req_hold 가운데 지금 판에 있고 활성 케이스가 없는 번호, 그리고 계정을 이미 넣은 역할 (도메인/작성 §3.6 「★ 역할별 계정」)
// 이어 작성 판정(authoring/continue.ts)과 GET /api/prd 의 held(prd/held.ts)가 같은 질의를 쓴다 — 둘이 다르면 화면은 켜지는데 서버가 막는다

import { 기본역할 } from '@platform/kit/accounts';
import type { Pool, PoolClient } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 보류줄 {
  reqId: string;
  role: string;
}

/**
 * 테스트가 생긴 번호(지도 ① 에 활성 케이스)와 지금 판에 없는 번호는 뺀다 — 「테스트 있음」이 이긴다.
 * 판이 없으면(표준 기획서 전) 비어 있다
 */
export async function 보류줄들(서비스: number, 손?: Pool | PoolClient): Promise<보류줄[]> {
  const r = await (손 ?? (await db())).query<{ req_id: string; role: string }>(
    `SELECT h.req_id, h.role
       FROM req_hold h
      WHERE h.service_id = $1
        AND EXISTS (SELECT 1 FROM prd_version v
                     WHERE v.service_id = h.service_id
                       AND v.version = (SELECT max(version) FROM prd_version WHERE service_id = h.service_id)
                       AND v.items @> jsonb_build_array(jsonb_build_object('reqId', h.req_id)))
        AND NOT EXISTS (SELECT 1 FROM req_case c JOIN test_case t ON t.tc_id = c.tc_id AND t.is_active
                         WHERE c.service_id = h.service_id AND c.req_id = h.req_id)
      ORDER BY h.req_id, h.role`,
    [서비스],
  );
  return r.rows.map((x) => ({ reqId: x.req_id, role: x.role }));
}

/**
 * 아이디 · 비밀번호가 둘 다 있는 역할 — 「운영 서버」가 아닌 줄 하나라도에 있으면 된다.
 * 일반 회원은 옛 칸(login_id · login_password), 그 밖은 role_accounts 원소. 비밀번호 원문은 읽지 않는다
 */
export async function 등록역할들(서비스: number, 손?: Pool | PoolClient): Promise<Set<string>> {
  const r = await (손 ?? (await db())).query<{ role: string }>(
    `SELECT $2::text AS role
       FROM service_env
      WHERE service_id = $1 AND NOT is_prod AND COALESCE(login_id, '') <> '' AND COALESCE(login_password, '') <> ''
      UNION
     SELECT btrim(a->>'role')
       FROM service_env e, jsonb_array_elements(e.role_accounts) a
      WHERE e.service_id = $1 AND NOT e.is_prod AND COALESCE(a->>'loginId', '') <> '' AND COALESCE(a->>'loginPassword', '') <> ''`,
    [서비스, 기본역할],
  );
  return new Set(r.rows.map((x) => x.role));
}
