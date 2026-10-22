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
 * 대상 서버 줄(env)마다 아이디 · 비밀번호가 둘 다 있는 역할 — 「운영 서버」 줄은 뺀다.
 * 일반 회원은 옛 칸(login_id · login_password), 그 밖은 role_accounts 원소. 비밀번호 원문은 읽지 않는다.
 * 이어 작성은 뿌리의 대상 서버 줄 계정만 받으므로 줄마다 나눠 둔다 — 서비스 어디에나 있으면 등록으로 보면 버튼은 열리는데 에이전트가 남은 번호를 못 센다
 */
export async function 등록역할표(서비스: number, 손?: Pool | PoolClient): Promise<Map<string, Set<string>>> {
  const r = await (손 ?? (await db())).query<{ env: string; role: string }>(
    `SELECT env, $2::text AS role
       FROM service_env
      WHERE service_id = $1 AND NOT is_prod AND COALESCE(login_id, '') <> '' AND COALESCE(login_password, '') <> ''
      UNION
     SELECT e.env, btrim(a->>'role')
       FROM service_env e, jsonb_array_elements(e.role_accounts) a
      WHERE e.service_id = $1 AND NOT e.is_prod AND COALESCE(a->>'loginId', '') <> '' AND COALESCE(a->>'loginPassword', '') <> ''`,
    [서비스, 기본역할],
  );
  const 표 = new Map<string, Set<string>>();
  for (const { env, role } of r.rows) 표.set(env, (표.get(env) ?? new Set<string>()).add(role));
  return 표;
}

/** 「운영 서버」가 아닌 줄 하나라도에 계정이 있는 역할 — 「PRD 관리」 줄 글(「계정 등록됨」)이 쓴다 */
export const 어디든등록 = (표: Map<string, Set<string>>): Set<string> => new Set([...표.values()].flatMap((s) => [...s]));

/** 이어 작성 판정 재료 — 「PRD 관리」가 뿌리 여럿을 볼 때 한 번만 읽어 넘긴다 */
export interface 보류재료 {
  보류: 보류줄[];
  표: Map<string, Set<string>>;
}

/** 그 대상 서버 줄에 계정을 넣은 역할의 보류 번호가 있나. 줄이 없으면(웹 정방향 뿌리) 없다 — 자식이 계정을 못 받는다. Android 앱은 부르는 쪽이 앱 줄을 준다(`계정줄env`) */
export function 줄에등록된보류있나(재료: 보류재료, env: string | null): boolean {
  const 역할 = env === null ? undefined : 재료.표.get(env);
  return 역할 !== undefined && 재료.보류.some((x) => 역할.has(x.role));
}
