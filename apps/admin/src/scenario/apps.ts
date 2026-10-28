// 시나리오에 섞인 애플리케이션을 DB 에서 읽는다 — 같은 프로젝트의 접두사 · 대상 서버 짝짓기 · 단계별 주소 (SPEC 도메인/시나리오 §3.7 결정 13)
// 시나리오는 시작 애플리케이션에 속하고, 단계가 어느 애플리케이션 것인지는 케이스 번호 앞 글자로 읽는다

import type { ScenarioDeleteStatus, ScenarioPart } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { Pool, PoolClient } from 'pg';

import { 대상서버계정 } from '../execution/savedInput.js';
import { 삭제코드를읽는다 } from '../prd/apiMap.js';
import { API인증읽기, type API인증, 어드민키읽기, type 어드민키 } from '../settings/envs.js';

import { type 앱종류, 케이스접두사 } from './mixed.js';

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

/** 그 접두사들 가운데 Android 앱 · 게임 애플리케이션의 종류. 나머지는 웹 단계로 돈다 (결정 16) */
export async function 앱종류읽기(접두사들: readonly string[], q?: 손): Promise<Map<string, 'APP' | 'GAME'>> {
  const r = await (q ?? (await db())).query<{ prefix: string; kind: 'APP' | 'GAME' }>(
    `SELECT prefix, kind FROM service WHERE prefix = ANY($1::text[]) AND kind IN ('APP', 'GAME')`,
    [접두사들],
  );
  return new Map(r.rows.map((x) => [x.prefix, x.kind]));
}

// 계정이 없는 애플리케이션이 부품마다 새 빈 배열을 만들면 채우기 묶음이 부품 수만큼 갈라진다 — 같은 배열을 쓴다
export const 계정없음: readonly 역할계정[] = [];

/**
 * 섞인 애플리케이션 모두의 서비스 지도 DELETE 성공 코드. 러너 입구 상한(1000줄)을 애플리케이션 수로 나눠 줄마다 자른다 —
 * 앞 애플리케이션이 상한을 다 쓰고 뒤 애플리케이션 것이 조용히 빠지지 않게 (SPEC 도메인/시나리오 §3.7 결정 13)
 */
export async function 삭제코드합치기(앱들: ReadonlyMap<string, 쓰는앱>, q?: 손): Promise<ScenarioDeleteStatus[]> {
  const 몫 = Math.floor(1000 / Math.max(앱들.size, 1));
  const 줄: ScenarioDeleteStatus[] = [];
  for (const 앱 of 앱들.values()) 줄.push(...(await 삭제코드를읽는다(앱.serviceId, q)).slice(0, 몫));
  return 줄;
}

export interface 쓰는앱 {
  serviceId: number;
  baseUrl: string;
  계정들: 역할계정[];
  // 비밀값 원문 — 러너 요청에만 싣고 부품 기록에는 안 넣는다 (도메인/API §3.8 「API 인증」 E2E)
  apiAuths: API인증[];
  kind: string;
  // 아래 둘은 앱 · 게임 애플리케이션만 쓴다 — 폰 연결에 한 벌 싣는다 (결정 16). 어드민 키는 원문이라 부품 기록에 안 넣는다
  appPath: string | null;
  adminKey: 어드민키 | null;
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
  const r = await 손잡이.query<{ prefix: string; id: string; kind: string; base_url: string | null; api_auths: unknown; app_path: string | null; admin_key: unknown }>(
    `SELECT s.prefix, s.id, s.kind, e.base_url, e.api_auths, NULLIF(e.app_path, '') AS app_path, e.admin_key FROM service s
       LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
      WHERE s.prefix = ANY($1::text[])`,
    [접두사들, env],
  );
  const 줄 = new Map(r.rows.map((x) => [x.prefix, x]));
  const 앱들 = new Map<string, 쓰는앱>();
  for (const prefix of 접두사들) {
    const x = 줄.get(prefix);
    if (x?.base_url == null) return { 앱들, 없음: prefix };
    앱들.set(prefix, {
      serviceId: Number(x.id),
      baseUrl: x.base_url,
      계정들: await 대상서버계정(손잡이, Number(x.id), env),
      apiAuths: API인증읽기(x.api_auths),
      kind: x.kind,
      appPath: x.app_path,
      adminKey: 어드민키읽기(x.admin_key),
    });
  }
  return { 앱들, 없음: null };
}

/** 쓰는 애플리케이션 가운데 Android 앱 · 게임 것 — 실행 · 시험 실행이 앱 · 게임 단계를 가른다 (결정 16) */
export function 앱종류들(앱들: ReadonlyMap<string, 쓰는앱>): 앱종류 {
  return new Map([...앱들].flatMap(([접두사, 앱]) => (앱.kind === 'APP' || 앱.kind === 'GAME' ? [[접두사, 앱.kind] as const] : [])));
}

/** case 단계와 API 인증을 고른 api 단계 애플리케이션의 API 인증. 없으면 빈 객체 — 러너 요청 부품에만 붙인다 (도메인/시나리오 §3.7 결정 14) */
export function 단계인증(part: ScenarioPart, 시작: string, 앱들: ReadonlyMap<string, 쓰는앱>): { apiAuths?: API인증[] } {
  const 접두사 = part.kind === 'case' ? 케이스접두사(part.tcId) : part.kind === 'api' && part.auth !== undefined ? (part.service ?? 시작) : undefined;
  const 인증들 = 접두사 === undefined ? [] : (앱들.get(접두사)?.apiAuths ?? []);
  return 인증들.length > 0 ? { apiAuths: 인증들 } : {};
}

/** 시작 애플리케이션이 아닌 case · api 단계의 주소. 그 밖은 빈 객체 — 요청 전체 주소로 돈다 */
export function 단계주소(part: ScenarioPart, 시작: string, 앱들: ReadonlyMap<string, 쓰는앱>): { baseUrl?: string } {
  const 접두사 = part.kind === 'case' ? 케이스접두사(part.tcId) : part.kind === 'api' ? (part.service ?? 시작) : 시작;
  const 주소 = part.kind === 'case' || part.kind === 'api' ? 앱들.get(접두사)?.baseUrl : undefined;
  return 접두사 === 시작 || 주소 === undefined ? {} : { baseUrl: 주소 };
}

