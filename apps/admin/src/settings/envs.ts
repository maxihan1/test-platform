// 대상 서버 줄 저장 — 계정 · 역할 계정 · 운영 서버 표시를 env 이름으로 이어받는다 (도메인/인증 §7 「envs[] 한 줄」)
// store.ts 가 300줄에 닿아 뗐다. 작성 집기 · 실행 채우기도 역할계정읽기 로 같은 칸을 읽는다

import type { 역할계정 } from '@platform/kit/accounts';

import type { PoolClient } from 'pg';

import type { 서비스판정 } from '../../../../scripts/authoring-crawl-viewport.js';

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
  }>('SELECT env, base_url, login_id, login_password, is_prod, role_accounts, viewport_kind, viewport_judged_at, app_path FROM service_env WHERE service_id = $1', [serviceId]);
  const 옛계정 = new Map(옛것.rows.map((r) => [r.env, r]));
  await client.query('DELETE FROM service_env WHERE service_id = $1', [serviceId]);
  for (const { env, baseUrl, loginId, loginPassword, isProd, accounts, appPath } of envs) {
    // 이름이 같은 줄만 이어받는다. 이름을 바꾸면 새 줄이라 계정을 다시 넣는다 (SPEC 도메인/인증 §7)
    const 전 = 옛계정.get(env);
    await client.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, role_accounts, viewport_kind, viewport_judged_at, app_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
        계정칸(appPath?.trim() ?? appPath, 전?.app_path ?? null),
      ],
    );
    // 화면별 차이도 옛 서버 것이다 — 남기면 새 판정 옆에 옛 서버 화면이 섞여 보인다 (PRD-F10-08 코드 검토)
    if (전 !== undefined && 전.base_url !== baseUrl) {
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
  'accounts', (SELECT COALESCE(json_agg(json_build_object(
                  'role', a.v->>'role', 'loginId', a.v->>'loginId',
                  'hasLoginPassword', COALESCE(a.v->>'loginPassword', '') <> '') ORDER BY a.n), '[]')
                 FROM jsonb_array_elements(e.role_accounts) WITH ORDINALITY AS a(v, n)))`;
