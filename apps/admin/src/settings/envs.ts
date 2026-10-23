// 대상 서버 줄 저장 — 계정 · 역할 계정 · 운영 서버 표시 · API 인증 · 어드민 키를 env 이름으로 이어받는다 (도메인/인증 §7 「envs[] 한 줄」)
// store.ts 가 300줄에 닿아 뗐다. 작성 집기 · 실행 채우기도 역할계정읽기 로 같은 칸을 읽는다

import type { 역할계정 } from '@platform/kit/accounts';

import type { PoolClient } from 'pg';

import type { 서비스판정 } from '../../../../scripts/authoring-crawl-viewport.js';

import { 설정오류 } from './errors.js';
import { 운영이름인가 } from './roles.js';

// 응답 한 줄. 비밀번호는 되돌려 보여주지 않는다 — 웹훅·피그마 토큰과 같은 규칙 (SPEC 도메인/인증 §7)
export interface 대상서버 {
  env: string;
  baseUrl: string;
  loginId: string | null;
  hasLoginPassword: boolean;
  isProd: boolean;
  /** 일반 회원 밖의 역할 계정 */
  accounts: { role: string; loginId: string | null; hasLoginPassword: boolean }[];
  /** 크롤러가 정한 화면 크기 판정과 그 시각. 훑기 전 · 주소를 바꾼 줄은 null 이다 (PRD-F10-08) */
  viewportKind: 서비스판정 | null;
  viewportJudgedAt: string | null;
  /** Android 앱 파일 경로(러너 컴퓨터 기준). null 이면 러너 환경값 PLATFORM_APP 을 쓴다 (APP-F1-03) */
  appPath: string | null;
  /** API 인증. 비밀값은 끝 4자리만 싣는다 (도메인/API §3.8 「API 인증」) */
  apiAuths: { name: string; tokenUrl: string; clientId: string; clientSecretLast4: string }[];
  /** 게임 서버 어드민 API 머리. 값은 끝 4자리만 싣는다 (도메인/게임 §3.10 「케이스 꼴」) */
  adminKey: { header: string; valueLast4: string } | null;
}

/** service_env.api_auths 한 줄. 비밀값 원문이다 — 러너 · 작성 에이전트까지만 간다 */
export interface API인증 {
  name: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

export type API인증입력 = Omit<API인증, 'clientSecret'> & { clientSecret?: string };

/** service_env.admin_key. 원문이다 — 러너 · 작성 에이전트까지만 간다 */
export interface 어드민키 {
  header: string;
  value: string;
}

export interface 역할계정입력 {
  role: string;
  loginId?: string | null;
  loginPassword?: string | null;
}

// 입력 한 줄. 계정 칸 규칙은 routes.ts 의 스키마 옆에 적었다
export interface 대상서버입력 {
  env: string;
  baseUrl: string;
  loginId?: string | null;
  loginPassword?: string | null;
  isProd?: boolean;
  accounts?: 역할계정입력[];
  appPath?: string | null;
  apiAuths?: API인증입력[];
  adminKey?: { header: string; value?: string } | null;
}

function 계정칸(보낸것: string | null | undefined, 옛것: string | null): string | null {
  if (보낸것 === undefined) return 옛것;
  return 보낸것 === null || 보낸것.trim() === '' ? null : 보낸것;
}

const 글자나널 = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** service_env.role_accounts 를 읽는다. JSONB 라 모양을 다시 본다 — 저장은 이 파일만 하지만 DB 는 손으로도 고친다 */
export function 역할계정읽기(값: unknown): 역할계정[] {
  if (!Array.isArray(값)) return [];
  return 값.flatMap((a: unknown) => {
    if (typeof a !== 'object' || a === null) return [];
    const { role, loginId, loginPassword } = a as Record<string, unknown>;
    return typeof role === 'string' ? [{ role, loginId: 글자나널(loginId), loginPassword: 글자나널(loginPassword) }] : [];
  });
}

/** service_env.api_auths 를 읽는다. 역할계정읽기 와 같은 까닭으로 모양을 다시 본다 */
export function API인증읽기(값: unknown): API인증[] {
  if (!Array.isArray(값)) return [];
  return 값.flatMap((a: unknown) => {
    if (typeof a !== 'object' || a === null) return [];
    const { name, tokenUrl, clientId, clientSecret } = a as Record<string, unknown>;
    return typeof name === 'string' && typeof tokenUrl === 'string' && typeof clientId === 'string' && typeof clientSecret === 'string'
      ? [{ name, tokenUrl, clientId, clientSecret }]
      : [];
  });
}

/**
 * 보낸 목록으로 바꾼다. 비밀값이 없는 줄은 같은 name 의 옛 비밀값을 잇는다 — 화면은 비밀값을 받은 적이 없다.
 * 토큰 주소가 바뀌면 잇지 않는다 — 이으면 끝 4자리만 본 사람이 비밀값 원문을 아무 주소로나 보내게 할 수 있다.
 * / 로 시작하는 토큰 주소는 대상 서버 주소에 붙어 풀리므로 대상 서버 주소가 바뀌어도 바뀐 것이다.
 * 키가 없으면 옛 목록을 비밀값 없이 다시 보낸 것과 같다 — 주소만 바꾼 저장이 이 규칙을 비켜 가지 않게
 */
function API인증이어받기(보낸것: API인증입력[] | undefined, 옛것: API인증[], 주소바뀜: boolean): API인증[] {
  const 목록: API인증입력[] = 보낸것 ?? 옛것.map(({ name, tokenUrl, clientId }) => ({ name, tokenUrl, clientId }));
  return 목록.map(({ name, tokenUrl, clientId, clientSecret }) => {
    const 이름 = name.trim();
    const 이을것 = 주소바뀜 && tokenUrl.startsWith('/') ? undefined : 옛것.find((o) => o.name === 이름 && o.tokenUrl === tokenUrl);
    const 비밀값 = clientSecret ?? 이을것?.clientSecret;
    if (비밀값 === undefined) throw new 설정오류('API_AUTH_SECRET_REQUIRED');
    return { name: 이름, tokenUrl, clientId, clientSecret: 비밀값 };
  });
}

/** service_env.admin_key 를 읽는다. 역할계정읽기 와 같은 까닭으로 모양을 다시 본다 */
export function 어드민키읽기(값: unknown): 어드민키 | null {
  if (typeof 값 !== 'object' || 값 === null) return null;
  const { header, value } = 값 as Record<string, unknown>;
  return typeof header === 'string' && typeof value === 'string' ? { header, value } : null;
}

/**
 * API인증이어받기 와 같은 규칙 — 키가 없으면 옛 머리를 값 없이 보낸 것, null 이면 지운다, 값이 없으면 같은 머리의 옛 값을 잇는다.
 * 대상 서버 주소가 바뀌면 잇지 않는다 — 케이스의 admin 요청이 그 주소로 가서 옛 값이 새 서버로 간다
 */
function 어드민키이어받기(보낸것: 대상서버입력['adminKey'], 옛것: 어드민키 | null, 주소바뀜: boolean): 어드민키 | null {
  const 보낸: { header: string; value?: string } | null = 보낸것 === undefined ? 옛것 && { header: 옛것.header } : 보낸것;
  if (보낸 === null) return null;
  const header = 보낸.header.trim();
  const value = 보낸.value ?? (!주소바뀜 && 옛것?.header === header ? 옛것.value : undefined);
  if (value === undefined) throw new 설정오류('ADMIN_KEY_VALUE_REQUIRED');
  return { header, value };
}

/** 보낸 역할 목록으로 바꾼다. 같은 role 의 옛 값을 일반 회원 계정과 같은 규칙으로 이어받고, 목록에서 뺀 역할은 지운다 */
function 역할계정이어받기(보낸것: 역할계정입력[] | undefined, 옛것: 역할계정[]): 역할계정[] {
  if (보낸것 === undefined) return 옛것;
  return 보낸것.map((a) => {
    const role = a.role.trim();
    const 전 = 옛것.find((o) => o.role === role);
    return { role, loginId: 계정칸(a.loginId, 전?.loginId ?? null), loginPassword: 계정칸(a.loginPassword, 전?.loginPassword ?? null) };
  });
}

export async function 대상서버넣기(client: PoolClient, serviceId: number, envs: 대상서버입력[]): Promise<void> {
  // 지우고 다시 넣으므로 계정을 먼저 읽어 둔다. 화면은 비밀번호를 받은 적이 없어 되돌려 보낼 수 없다.
  // 같은 client 로 읽는다 — 서비스고치기가 서비스 행을 먼저 잠가 같은 서비스의 저장이 겹치지 않는다
  const 옛것 = await client.query<{
    env: string;
    base_url: string;
    login_id: string | null;
    login_password: string | null;
    is_prod: boolean;
    role_accounts: unknown;
    viewport_kind: string | null;
    viewport_judged_at: Date | null;
    app_path: string | null;
    api_auths: unknown;
    admin_key: unknown;
  }>('SELECT env, base_url, login_id, login_password, is_prod, role_accounts, viewport_kind, viewport_judged_at, app_path, api_auths, admin_key FROM service_env WHERE service_id = $1', [serviceId]);
  const 옛계정 = new Map(옛것.rows.map((r) => [r.env, r]));
  await client.query('DELETE FROM service_env WHERE service_id = $1', [serviceId]);
  for (const { env, baseUrl, loginId, loginPassword, isProd, accounts, appPath, apiAuths, adminKey } of envs) {
    // 이름이 같은 줄만 이어받는다. 이름을 바꾸면 새 줄이라 계정을 다시 넣는다 (SPEC 도메인/인증 §7)
    const 전 = 옛계정.get(env);
    const 주소바뀜 = 전 !== undefined && 전.base_url !== baseUrl;
    const 키 = 어드민키이어받기(adminKey, 어드민키읽기(전?.admin_key), 주소바뀜);
    await client.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, role_accounts, viewport_kind, viewport_judged_at, app_path, api_auths, admin_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        serviceId,
        env,
        baseUrl,
        계정칸(loginId, 전?.login_id ?? null),
        계정칸(loginPassword, 전?.login_password ?? null),
        // 운영 표시를 잃으면 크롤러가 운영으로 간다 — 키가 없으면 옛 값 그대로, 새 줄이면 마이그레이션과 같은 이름 규칙이다
        isProd ?? 전?.is_prod ?? 운영이름인가(env),
        JSON.stringify(역할계정이어받기(accounts, 역할계정읽기(전?.role_accounts))),
        // 화면 크기 판정은 크롤러가 정한다 — 설정 저장으로 잃지 않는다. 주소를 바꾸면 다른 서버라 다음 크롤까지 비운다 (PRD-F10-07)
        전?.base_url === baseUrl ? 전.viewport_kind : null,
        전?.base_url === baseUrl ? 전.viewport_judged_at : null,
        // 계정 칸과 같은 규칙 — 키가 없으면 옛 값, null · 빈 글자면 지운다. 앞뒤 공백은 경로가 아니라 실수다
        계정칸(typeof appPath === 'string' ? appPath.trim() : appPath, 전?.app_path ?? null),
        JSON.stringify(API인증이어받기(apiAuths, API인증읽기(전?.api_auths), 주소바뀜)),
        키 === null ? null : JSON.stringify(키),
      ],
    );
    // 화면별 차이도 옛 서버 것이다 — 남기면 새 판정 옆에 옛 서버 화면이 섞여 보인다 (PRD-F10-08 코드 검토)
    if (주소바뀜) {
      await client.query('UPDATE screen_found SET viewport = NULL WHERE service_id = $1 AND env = $2', [serviceId, env]);
    }
  }
}

/**
 * 설정 목록 응답의 envs 한 줄을 만드는 SQL 식(별칭 e = service_env). 비밀번호는 있는지만 싣는다 —
 * 원문을 고르는 식을 두지 않아야 응답에 새지 않는다
 */
export const 대상서버칸식 = `json_build_object(
  'env', e.env, 'baseUrl', e.base_url, 'loginId', e.login_id,
  'hasLoginPassword', e.login_password IS NOT NULL AND e.login_password <> '',
  'isProd', e.is_prod,
  'viewportKind', e.viewport_kind, 'viewportJudgedAt', e.viewport_judged_at,
  'appPath', e.app_path,
  'apiAuths', (SELECT COALESCE(json_agg(json_build_object(
                  'name', a.v->>'name', 'tokenUrl', a.v->>'tokenUrl', 'clientId', a.v->>'clientId',
                  'clientSecretLast4', right(a.v->>'clientSecret', 4)) ORDER BY a.n), '[]')
                 FROM jsonb_array_elements(e.api_auths) WITH ORDINALITY AS a(v, n)),
  'adminKey', CASE WHEN e.admin_key IS NULL THEN NULL
                   ELSE json_build_object('header', e.admin_key->>'header', 'valueLast4', right(e.admin_key->>'value', 4)) END,
  'accounts', (SELECT COALESCE(json_agg(json_build_object(
                  'role', a.v->>'role', 'loginId', a.v->>'loginId',
                  'hasLoginPassword', COALESCE(a.v->>'loginPassword', '') <> '') ORDER BY a.n), '[]')
                 FROM jsonb_array_elements(e.role_accounts) WITH ORDINALITY AS a(v, n)))`;
