// 역방향 작성 요청의 대상 서버·시작 주소 판정과 대상 서버 줄 읽기 (SPEC 도메인/작성 §3.6 「★ 역방향」 · 「★ 역할별 계정」 · §7)

import { 기본역할, type 역할계정 } from '@platform/kit/accounts';

import type { PoolClient } from 'pg';

import { 역할계정읽기 } from '../settings/envs.js';

/**
 * 시작 주소를 받을 수 있으면 **다시 조립한 href** 를, 아니면 null 을 준다.
 *
 * 대상 서버(`baseUrl`)와 출처(scheme+host+port)가 같은 http·https 주소만 받는다.
 * **실수 방지다 — 자식을 막는 장치가 아니다** (§3.6 출처 규칙). 다시 조립한 값을 저장하므로
 * 에이전트가 받는 글자는 URL 파서가 한 번 정리한 것이다.
 *
 * `baseUrl` 은 설정 화면이 자유 글자로 받은 칸이라 깨져 있을 수 있다 — 던지지 않고 null 이다.
 */
export function 시작주소(startUrl: unknown, baseUrl: unknown): string | null {
  if (typeof startUrl !== 'string' || typeof baseUrl !== 'string') return null;
  let 주소: URL;
  let 서버: URL;
  try {
    주소 = new URL(startUrl);
    서버 = new URL(baseUrl);
  } catch {
    return null;
  }
  if (주소.protocol !== 'http:' && 주소.protocol !== 'https:') return null;
  if (주소.username !== '' || 주소.password !== '') return null;
  return 주소.origin === 서버.origin ? 주소.href : null;
}

/** 대상 서버 줄 하나. 계정은 집기 응답 · 실행 채우기에만 나간다 — 목록·상세·400 본문에 싣지 않는다 */
export interface 대상줄 {
  env: string;
  baseUrl: string;
  loginId: string | null;
  loginPassword: string | null;
  /** 「운영 서버」 체크 — 작성 · 화면 탐색이 안 간다(실행은 간다) (§3.6 「★ 역할별 계정」 「운영 서버」) */
  isProd: boolean;
  /** 일반 회원(위 두 칸) 다음 역할 계정. 실행 채우기와 집기 accounts 가 이 차례로 읽는다 */
  계정들: 역할계정[];
}

type 묻기 = Pick<PoolClient, 'query'>;
type 줄행 = { env: string; base_url: string; login_id: string | null; login_password: string | null; is_prod: boolean; role_accounts: unknown };
const 줄칸 = 'env, base_url, login_id, login_password, is_prod, role_accounts';

const 줄로 = (행: 줄행): 대상줄 => ({
  env: 행.env,
  baseUrl: 행.base_url,
  loginId: 행.login_id,
  loginPassword: 행.login_password,
  isProd: 행.is_prod,
  계정들: [{ role: 기본역할, loginId: 행.login_id, loginPassword: 행.login_password }, ...역할계정읽기(행.role_accounts)],
});

// 풀은 쓸 때 가져온다 — DATABASE_URL 없이 도는 검사가 이 파일의 순수 함수를 import 한다
async function 풀(): Promise<묻기> {
  return (await import('../db/index.js')).pool;
}

/** 트랜잭션 안에서 부르면 그 연결(q)을 넘긴다 — 쥔 채 풀에서 또 꺼내면 동시 요청이 풀 크기만큼 올 때 교착한다 */
export async function 대상줄읽기(서비스: number, env: string, q?: 묻기): Promise<대상줄 | null> {
  const r = await (q ?? (await 풀())).query<줄행>(`SELECT ${줄칸} FROM service_env WHERE service_id = $1 AND env = $2`, [서비스, env]);
  const 행 = r.rows[0];
  return 행 === undefined ? null : 줄로(행);
}

/** 그 서비스의 대상 서버 줄 전부, env 순 */
export async function 대상줄들읽기(서비스: number): Promise<대상줄[]> {
  const r = await (await 풀()).query<줄행>(`SELECT ${줄칸} FROM service_env WHERE service_id = $1 ORDER BY env`, [서비스]);
  return r.rows.map(줄로);
}

/**
 * 작성이 갈 수 있는 줄인가. 로그인하려면 둘 다 필요하다 — 하나만 있는 줄은 운영 줄처럼 다룬다 (§3.6 「운영 서버 보호」).
 * 「운영 서버」 체크한 줄은 계정이 있어도 안 된다 — 실행이 서버 계정을 쓰면서 운영 줄에도 계정이 들어간다 (§3.6 「★ 역할별 계정」)
 */
export function 계정있는줄(줄: 대상줄 | null): 줄 is 대상줄 {
  return 줄 !== null && !줄.isProd && (줄.loginId ?? '') !== '' && (줄.loginPassword ?? '') !== '';
}

export interface 대상 {
  env: string;
  baseUrl: string | null;
  startUrl: string | null;
  loginId: string | null;
  loginPassword: string | null;
}

/** 집기 응답 accounts 한 줄 (§7 claim) */
export interface 집기계정 {
  env: string;
  baseUrl: string;
  role: string;
  loginId: string;
  loginPassword: string;
}

/** 줄마다 일반 회원 다음 역할 계정 — 아이디 · 비밀번호가 둘 다 있는 것만 */
const 실을계정 = (줄들: 대상줄[]): 집기계정[] =>
  줄들.flatMap((줄) =>
    줄.계정들.flatMap(({ role, loginId, loginPassword }) =>
      (loginId ?? '') !== '' && (loginPassword ?? '') !== ''
        ? [{ env: 줄.env, baseUrl: 줄.baseUrl, role, loginId: loginId ?? '', loginPassword: loginPassword ?? '' }]
        : [],
    ),
  );

/**
 * 집기 응답의 `target` 과 `accounts`. 실을 것이 없으면 그 키 자체를 안 싣는다(피그마 토큰과 같은 규칙).
 *
 * target 은 대조 행에만 — **줄이 지워졌어도 싣는다**(서버·계정 칸이 null). 키가 없으면 에이전트가 정방향으로 오인한다.
 * 만든 뒤 설정이 바뀌었는지(계정 빠짐 · 출처 어긋남) 가려 실패시키는 것은 **에이전트**다 (§7).
 *
 * accounts 는 자식 · 3회 실행이 갈 줄의 계정이다 (§3.6 「★ 역할별 계정」) — 대조 행은 그 줄, 값을 채운 보류가 있는 머지는
 * `머지env`(머지집기칸 의 target) 줄, 반영 행(`params.prdApply` — 화면이 맞음 포함)은 운영 아닌 줄 전부
 */
export async function 집기대상칸(
  서비스: number,
  행: { compare: boolean; env: string | null; startUrl: string | null; params: Record<string, unknown> },
  머지env: string | null | undefined,
): Promise<{ target?: 대상; accounts?: 집기계정[] }> {
  const 대조 = 행.compare && 행.env !== null;
  const 줄 = 대조 && 행.env !== null ? await 대상줄읽기(서비스, 행.env) : null;
  const target: 대상 | undefined =
    대조 && 행.env !== null
      ? { env: 행.env, baseUrl: 줄?.baseUrl ?? null, startUrl: 행.startUrl, loginId: 줄?.loginId ?? null, loginPassword: 줄?.loginPassword ?? null }
      : undefined;
  const 머지줄 = !대조 && typeof 머지env === 'string' ? await 대상줄읽기(서비스, 머지env) : null;
  const 줄들 =
    행.params.prdApply === true
      ? (await 대상줄들읽기(서비스)).filter((z) => !z.isProd)
      : [줄, 머지줄].filter((z): z is 대상줄 => z !== null);
  const accounts = 실을계정(줄들);
  return { ...(target === undefined ? {} : { target }), ...(accounts.length === 0 ? {} : { accounts }) };
}

export type 역방향칸 =
  | { compare: false }
  | { compare: true; env: string; startUrl: string | null }
  | { error: 'BAD_ENV' | 'BAD_START_URL' };

/**
 * 만들기 본문의 `compare · env · startUrl` 을 판정한다 (§7 AUTHOR 역방향).
 *
 * 순서가 명세다 — 대조가 아닌데 시작 주소가 오면 `BAD_START_URL`, 대상 서버만 오면 `BAD_ENV`.
 * `compare` 가 참·거짓이 아닌 값이면 역방향 칸 묶음의 오류(`BAD_ENV`)로 본다.
 */
export async function 역방향칸판정(본문: Record<string, unknown>, 서비스: number): Promise<역방향칸> {
  const { compare, env, startUrl } = 본문;
  const 주소있음 = startUrl !== undefined && startUrl !== null;
  if (compare !== undefined && typeof compare !== 'boolean') return { error: 'BAD_ENV' };
  if (compare !== true) {
    if (주소있음) return { error: 'BAD_START_URL' };
    if (env !== undefined && env !== null) return { error: 'BAD_ENV' };
    return { compare: false };
  }
  if (typeof env !== 'string' || env === '') return { error: 'BAD_ENV' };
  const 줄 = await 대상줄읽기(서비스, env);
  if (!계정있는줄(줄)) return { error: 'BAD_ENV' };
  if (!주소있음) return { compare: true, env, startUrl: null };
  const 정규 = 시작주소(startUrl, 줄.baseUrl);
  return 정규 === null ? { error: 'BAD_START_URL' } : { compare: true, env, startUrl: 정규 };
}
