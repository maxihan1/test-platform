// 역방향 작성 요청의 대상 서버·시작 주소 판정과 대상 서버 줄 읽기 (SPEC 도메인/작성 §3.6 「★ 역방향」 · 「★ 역할별 계정」 · §7)

import { 기본역할, type 역할계정 } from '@platform/kit/accounts';
import { 패키지이름인가 } from '@platform/kit/protocol';

import type { PoolClient } from 'pg';

import { 문서설정읽기 } from '../apidoc/store.js';
import { 앱칸, 최신빌드 } from '../execution/buildFile.js';
import { API인증읽기, type API인증, type 어드민키, 어드민키읽기, 역할계정읽기 } from '../settings/envs.js';
import { 어드민키종류인가 } from '../settings/roles.js';

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
  /** Android 앱 파일 경로(러너 컴퓨터 기준). 테스트 실행이 이 줄을 주소로 찾아 러너에 싣는다 (APP-F1-03) */
  appPath: string | null;
  /** API 인증 — 비밀값 원문이다. 테스트 실행이 러너에 싣는다 (도메인/API §3.8) */
  apiAuths: API인증[];
  /** 게임 서버 어드민 키 — 원문이다. 게임 케이스 실행이 러너에 싣는다 (도메인/게임 §3.10) */
  adminKey: 어드민키 | null;
}

type 묻기 = Pick<PoolClient, 'query'>;
type 줄행 = { env: string; base_url: string; login_id: string | null; login_password: string | null; is_prod: boolean; role_accounts: unknown; app_path: string | null; api_auths: unknown; admin_key: unknown };
const 줄칸 = 'env, base_url, login_id, login_password, is_prod, role_accounts, app_path, api_auths, admin_key';

const 줄로 = (행: 줄행): 대상줄 => ({
  env: 행.env,
  baseUrl: 행.base_url,
  loginId: 행.login_id,
  loginPassword: 행.login_password,
  isProd: 행.is_prod,
  계정들: [{ role: 기본역할, loginId: 행.login_id, loginPassword: 행.login_password }, ...역할계정읽기(행.role_accounts)],
  // 손으로 고친 빈 글자도 없음이다 — 그대로 보내면 러너가 400 으로 거절한다
  appPath: 행.app_path === '' ? null : 행.app_path,
  apiAuths: API인증읽기(행.api_auths),
  adminKey: 어드민키읽기(행.admin_key),
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
export async function 대상줄들읽기(서비스: number, q?: 묻기): Promise<대상줄[]> {
  const r = await (q ?? (await 풀())).query<줄행>(`SELECT ${줄칸} FROM service_env WHERE service_id = $1 ORDER BY env`, [서비스]);
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
  /** 「운영 서버」로 체크된 줄 — 그때 계정 칸은 비어 온다. 에이전트가 이 까닭으로 FAILED 를 낸다 (§7 claim) */
  isProd?: true;
  /**
   * 테스트를 안 만들 화면 틀 — 결정 목록에서 [제외]한 것(service.skip_screens)과 이 요청에서 고르지 않은 것(params.skipScreens).
   * 화면만 작성은 이것도 「이미 확인한 화면」으로 보고 건너뛴다. 없으면 안 싣는다 (§3.6 「★ 결정 목록」 「제외한 화면」)
   */
  skipScreens?: string[];
}

/**
 * 계정이 서버를 떠나는 자리(집기)는 운영 줄 계정을 안 싣는다. 요청을 만든 뒤 「운영 서버」로 체크해도 여기서 막힌다 —
 * 만들 때 · 재실행 · 이어 작성의 BAD_ENV 만으로는 이미 선 요청을 못 막는다 (§3.6 「★ 역할별 계정」 「운영 서버」)
 */
export const 작성에실을줄 = (줄: 대상줄 | null): 대상줄 | null =>
  줄 === null || !줄.isProd ? 줄 : { ...줄, loginId: null, loginPassword: null, 계정들: [] };

/**
 * Android 앱의 앱 줄 — 요청에 대상 서버가 있으면 그 줄, 없으면 앱 파일 경로가 있는 첫 줄(env 순). 「실서비스 서버」 줄은 어느 쪽이든 건너뛴다.
 * 앱 첫 화면과 집기 accounts 가 같은 줄을 봐야 AI 가 읽는 앱과 로그인 계정의 서버가 맞는다 (§3.6 「★ 역할별 계정」 표 「작성 · 반영 때」 · §7 「앱 화면 통로」)
 */
export function 앱줄고르기<T extends { env: string; appPath: string | null; isProd: boolean }>(줄들: T[], env: string | null): T | undefined {
  return 줄들.filter((j) => !j.isProd).find((j) => (env === null ? j.appPath !== null : j.env === env));
}

/**
 * 그 줄에 폰에서 켤 앱이 있나 — 최신 빌드(올린 APK · 회사 저장소 주소)나 앱 파일 경로(패키지 이름 포함). 앱 화면 통로(깔앱파일)가 「앱 없는 서비스」로 보는 줄이 아니다.
 * 판정은 실행과 같은 `앱칸` 이다 — 파일도 주소도 없는 빌드 행(배포 신호만 남긴 것)은 앱이 아니다
 */
async function 켤앱있나(서비스: number, 줄: 대상줄, 게임: boolean): Promise<boolean> {
  const 칸 = 앱칸(await 최신빌드(await 풀(), 서비스, 줄.env), 줄.appPath);
  // 게임은 SDK 를 넣은 QA 빌드라야 한다 — 스토어 패키지 이름은 안 받는다(설정도 400 · 러너 §5.2 「플레이스토어 앱」). 앱에서 게임으로 종류를 바꾼 줄에 남을 수 있다
  return Object.keys(칸).length > 0 && !(게임 && 칸.app !== undefined && 패키지이름인가(칸.app));
}

/** 폰에서 도는 애플리케이션 — 웹 크롤러가 못 읽어 앱 줄 계정으로 작성한다. 대조는 appium-cli · 창 훑기가 훑는다 (도메인/게임 §3.10 「작성 — 한 바퀴」 · 작성 §3.6 「앱 · 게임 역방향」) */
export const 폰앱종류 = ['APP', 'GAME'];
export const 폰앱인가 = (kind: string | null | undefined): boolean => 폰앱종류.includes(kind ?? '');

/**
 * 대조 없이 대상 서버 줄 하나의 계정 · 어드민 키로 작성하는 종류 — 앱 · 게임은 앱 줄, API 는 요청 env 줄(env 가 있어야 한다),
 * 웹은 요청 env 줄 · 없으면 일반 회원 계정이 있는 첫 줄(실서비스 서버 줄 제외 · 2026-11-11 사용자 「모든 기능에 로그인」 — 정방향 웹이 로그인 뒤 요구를 전부 `계정 미등록` 으로 뺐다).
 * 집기(집기대상칸) · 이어 작성(계정줄env) · 「PRD 관리」 이어 작성 뿌리(held.ts)가 같이 본다 — 어긋나면 화면은 열리는데 서버가 막는다
 */
export const 줄로작성종류 = [...폰앱종류, 'API', 'SCREEN'];
export const 줄로작성하나 = (kind: string | null | undefined, env: string | null): boolean =>
  폰앱인가(kind) || (kind === 'API' && env !== null) || kind === 'SCREEN';

/**
 * 줄로작성하나 가 참일 때 계정을 받을 줄 — 앱 · 게임은 앱 줄, 그 밖은 요청 env 줄, env 가 없으면(웹 정방향) 일반 회원 계정이 있는 첫 줄(env 순).
 * 「실서비스 서버」 줄은 고르지 않는다 — 계정이 빈 줄을 먼저 고르면 계정을 넣은 줄이 있어도 하나도 안 실린다
 */
export function 계정줄고르기(kind: string | null | undefined, 줄들: 대상줄[], env: string | null): 대상줄 | undefined {
  if (폰앱인가(kind)) return 앱줄고르기(줄들, env);
  return env === null ? 줄들.find(계정있는줄) : 줄들.find((j) => !j.isProd && j.env === env);
}

/** 집기 응답 target 한 벌 — 운영 줄이면 계정이 비고 isProd 가 붙는다 */
export function 집기대상(env: string, 원줄: 대상줄 | null, startUrl: string | null): 대상 {
  const 줄 = 작성에실을줄(원줄);
  return {
    env,
    baseUrl: 줄?.baseUrl ?? null,
    startUrl,
    loginId: 줄?.loginId ?? null,
    loginPassword: 줄?.loginPassword ?? null,
    ...(원줄?.isProd === true ? { isProd: true as const } : {}),
  };
}

/** 제외한 화면 + 이 요청에서 고르지 않은 화면. params 는 통로가 막지 않아 사람이 낸 값이 올 수 있다 — 글자만 받는다 */
async function 건너뛸화면(서비스: number, 요청것: unknown): Promise<string[]> {
  const r = await (await 풀()).query<{ skip_screens: string[] }>('SELECT skip_screens FROM service WHERE id = $1', [서비스]);
  const 요청 = Array.isArray(요청것) ? 요청것.filter((x): x is string => typeof x === 'string') : [];
  return [...new Set([...(r.rows[0]?.skip_screens ?? []), ...요청])];
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

/** 집기 응답 adminKey — 게임의 앱 줄 · API 의 작성 행 대상 서버 줄 어드민 키와 그 줄 (§7 claim · 도메인/게임 §3.10 「작성 — 한 바퀴」) */
export interface 집기어드민키 extends 어드민키 {
  env: string;
  baseUrl: string;
}

/**
 * 집기 응답의 `target` 과 `accounts` · `adminKey`. 실을 것이 없으면 그 키 자체를 안 싣는다(피그마 토큰과 같은 규칙).
 *
 * target 은 대조 행에만 — **줄이 지워졌어도 싣는다**(서버·계정 칸이 null). 키가 없으면 에이전트가 정방향으로 오인한다.
 * 만든 뒤 설정이 바뀌었는지(계정 빠짐 · 출처 어긋남) 가려 실패시키는 것은 **에이전트**다 (§7).
 *
 * accounts 는 자식 · 3회 실행이 갈 줄의 계정이다 (§3.6 「★ 역할별 계정」) — 대조 행은 그 줄, 값을 채운 보류가 있는 머지는
 * `머지env`(머지집기칸 의 target) 줄, 반영 행(`params.prdApply` — 화면이 맞음 포함)은 운영 아닌 줄 전부.
 * Android 앱 · 게임은 어느 행이든 앱 줄(`앱줄고르기`)을, API 는 작성 행의 대상 서버 줄을 맨 앞에 둔다. 웹은 작성 · 다시 작성 행만 그 줄(`계정줄고르기`)을 싣는다.
 * adminKey 는 게임 · API 의 그 맨 앞 줄 키다 — 작성 AI 가 상태 도우미 · 어드민 API 를 불러 보고 케이스를 돌려 볼 때 kit 이 몸통 admin 의 머리로 쓴다
 */
export async function 집기대상칸(
  서비스: number,
  행: { kind: string; compare: boolean; env: string | null; startUrl: string | null; params: Record<string, unknown> },
  머지env: string | null | undefined,
): Promise<{ target?: 대상; accounts?: 집기계정[]; adminKey?: 집기어드민키 }> {
  // PRD 초안도 대조처럼 그 줄의 화면을 훑는다 — 대상 서버 · 계정을 같은 길로 싣는다 (도메인/BTS 「PRD 초안 → 결정 필요」)
  const 대조env = 행.compare || 행.kind === 'PRD_DRAFT' ? 행.env : null;
  const 원줄 = 대조env !== null ? await 대상줄읽기(서비스, 대조env) : null;
  const 건너뛸 = 대조env !== null ? await 건너뛸화면(서비스, 행.params.skipScreens) : [];
  const target = 대조env !== null ? { ...집기대상(대조env, 원줄, 행.startUrl), ...(건너뛸.length === 0 ? {} : { skipScreens: 건너뛸 }) } : undefined;
  const 줄 = 작성에실을줄(원줄);
  const 머지줄 = 대조env === null && typeof 머지env === 'string' ? 작성에실을줄(await 대상줄읽기(서비스, 머지env)) : null;
  const 그밖 =
    행.params.prdApply === true
      ? (await 대상줄들읽기(서비스)).filter((z) => !z.isProd)
      : [줄, 머지줄].filter((z): z is 대상줄 => z !== null);
  // 정방향 Android 앱 · 게임 · API · 웹은 대조 줄이 없어 이 길이 아니면 AI 가 로그인할 계정을 받을 곳이 없다 (2026-10-22 · 2026-11-03 · 2026-11-11 사용자).
  // 앱 대조는 요청 env 가 곧 앱 줄이라(앱줄고르기가 그 줄을 먼저 고른다) 같은 줄이 한 번만 실린다 (§3.6 「앱 · 게임 역방향」 8)
  // 앞줄(앱은 앱 줄, API 는 작성 행의 대상 서버 줄)을 맨 앞에 둔다 — 자식은 첫 「일반 회원」으로 로그인하는데 반영 · 머지 행은 다른 줄도 싣는다
  const 종류 = (await 문서설정읽기(서비스))?.kind;
  // 웹은 작성 · 다시 작성 행에만 — 머지 · 케이스 고치기 · PRD 초안은 위에서 고른 줄만 싣는다. 대조 · 반영 행은 같은 줄이 이미 실려 있어 차례만 바뀐다 (§3.6 「★ 역할별 계정」 표 「작성 · 반영 때」)
  const 웹작성행 = 행.kind === 'AUTHOR' || 행.kind === 'RERUN';
  const 앞줄 = 줄로작성하나(종류, 행.env) && (종류 !== 'SCREEN' || 웹작성행) ? 계정줄고르기(종류, await 대상줄들읽기(서비스), 행.env) : undefined;
  const 줄들 = 앞줄 === undefined ? 그밖 : [앞줄, ...그밖.filter((z) => z.env !== 앞줄.env)];
  const accounts = 실을계정(줄들);
  // 앞줄만 — 계정 · 게임 첫 화면과 같은 서버라야 도우미가 AI 가 로그인한 그 캐릭터를 바꾼다. 앞줄은 「실서비스 서버」가 아니다(앱줄고르기)
  const 키 = 어드민키종류인가(종류) ? 앞줄?.adminKey : undefined;
  const adminKey = 앞줄 === undefined || 키 === undefined || 키 === null ? undefined : { env: 앞줄.env, baseUrl: 앞줄.baseUrl, ...키 };
  return { ...(target === undefined ? {} : { target }), ...(accounts.length === 0 ? {} : { accounts }), ...(adminKey === undefined ? {} : { adminKey }) };
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
  // 앱 · 게임은 주소가 없어 앱을 켠 첫 화면에서 시작한다. 만들기 · 재실행 · 이어 작성이 모두 여기를 지난다 —
  // 종류가 바뀌기 전에 세운 대조 원본을 물려받아도 그 종류의 규칙을 탄다 (§3.6 「★ 역방향」 「앱 · 게임 역방향」 1)
  // 대조 · 시작 주소가 없으면 종류를 볼 일이 없다 — 정방향 만들기 · 재실행 · 이어 작성마다 설정을 읽지 않는다
  const 종류 = compare === true || 주소있음 ? (await 문서설정읽기(서비스))?.kind : undefined;
  if (폰앱인가(종류) && 주소있음) return { error: 'BAD_ENV' };
  if (compare !== true) {
    if (주소있음) return { error: 'BAD_START_URL' };
    if (env !== undefined && env !== null) return { error: 'BAD_ENV' };
    return { compare: false };
  }
  if (typeof env !== 'string' || env === '') return { error: 'BAD_ENV' };
  const 줄 = await 대상줄읽기(서비스, env);
  // 앱 · 게임은 계정이 없어도 로그아웃 판만 훑는다. 대신 폰에서 켤 앱(최신 빌드 · 앱 파일 경로)이 있어야 한다 — 앱 화면 통로(appScreen.ts)와 같은 판정에 게임은 패키지 이름을 더 거른다
  if (폰앱인가(종류)) return 줄 !== null && !줄.isProd && (await 켤앱있나(서비스, 줄, 종류 === 'GAME')) ? { compare: true, env, startUrl: null } : { error: 'BAD_ENV' };
  if (!계정있는줄(줄)) return { error: 'BAD_ENV' };
  if (!주소있음) return { compare: true, env, startUrl: null };
  const 정규 = 시작주소(startUrl, 줄.baseUrl);
  return 정규 === null ? { error: 'BAD_START_URL' } : { compare: true, env, startUrl: 정규 };
}
