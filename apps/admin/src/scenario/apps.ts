// 시나리오에 섞인 애플리케이션을 DB 에서 읽는다 — 같은 프로젝트의 접두사 · 대상 서버 짝짓기 · 단계별 주소 (SPEC 도메인/시나리오 §3.7 결정 13)
// 시나리오는 시작 애플리케이션에 속하고, 단계가 어느 애플리케이션 것인지는 케이스 번호 앞 글자로 읽는다

import type { ScenarioPart } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { Pool, PoolClient } from 'pg';

import { 대상서버계정 } from '../execution/savedInput.js';

import { 케이스접두사 } from './mixed.js';

type 손 = Pick<PoolClient, 'query'>;

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 그 접두사와 같은 프로젝트의 활성 애플리케이션 접두사. 자기 자신이 맨 앞이고 비활성이어도 든다 —
 * 시작 애플리케이션의 케이스를 막으면 안 된다. 모르는 접두사는 [접두사] 다
 */
export async function 같은프로젝트접두사(prefix: string, q?: 손): Promise<string[]> {
  const r = await (q ?? (await db())).query<{ prefix: string }>(
    `SELECT s.prefix FROM service s JOIN service me ON me.project_id = s.project_id
      WHERE me.prefix = $1 AND (s.is_active OR s.prefix = $1)
      ORDER BY (s.prefix = $1) DESC, s.prefix`,
    [prefix],
  );
  return r.rows.length === 0 ? [prefix] : r.rows.map((x) => x.prefix);
}

export interface 쓰는앱 {
  serviceId: number;
  baseUrl: string;
  계정들: 역할계정[];
}

/**
 * 접두사마다 그 이름(env)의 대상 서버 주소와 계정을 읽는다. 하나라도 이름이 없으면 그 접두사를 `없음` 으로 준다 —
 * 순서는 받은 차례(시작 애플리케이션이 먼저)다. 연결을 쥔 채면 그 연결을 넘긴다
 */
export async function 쓰는앱읽기(
  접두사들: readonly string[],
  env: string,
  q?: 손,
): Promise<{ 앱들: Map<string, 쓰는앱>; 없음: string | null }> {
  const 손잡이 = q ?? (await db());
  const r = await 손잡이.query<{ prefix: string; id: string; base_url: string | null }>(
    `SELECT s.prefix, s.id, e.base_url FROM service s
       LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
      WHERE s.prefix = ANY($1::text[])`,
    [접두사들, env],
  );
  const 줄 = new Map(r.rows.map((x) => [x.prefix, x]));
  const 앱들 = new Map<string, 쓰는앱>();
  for (const prefix of 접두사들) {
    const x = 줄.get(prefix);
    if (x?.base_url == null) return { 앱들, 없음: prefix };
    앱들.set(prefix, { serviceId: Number(x.id), baseUrl: x.base_url, 계정들: await 대상서버계정(손잡이, Number(x.id), env) });
  }
  return { 앱들, 없음: null };
}

/** 시작 애플리케이션이 아닌 case · api 단계의 주소. 그 밖은 빈 객체 — 요청 전체 주소로 돈다 */
export function 단계주소(part: ScenarioPart, 시작: string, 앱들: ReadonlyMap<string, 쓰는앱>): { baseUrl?: string } {
  const 접두사 = part.kind === 'case' ? 케이스접두사(part.tcId) : part.kind === 'api' ? (part.service ?? 시작) : 시작;
  const 주소 = part.kind === 'case' || part.kind === 'api' ? 앱들.get(접두사)?.baseUrl : undefined;
  return 접두사 === 시작 || 주소 === undefined ? {} : { baseUrl: 주소 };
}

