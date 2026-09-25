// 역방향 작성 요청의 대상 서버·시작 주소 판정과 대상 서버 줄 읽기 (SPEC 도메인/작성 §3.6 「★ 역방향」 · §7)

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

/** 대상 서버 줄 하나. 계정은 집기 응답에만 나간다 — 목록·상세·400 본문에 싣지 않는다 */
export interface 대상줄 {
  baseUrl: string;
  loginId: string | null;
  loginPassword: string | null;
}

export async function 대상줄읽기(서비스: number, env: string): Promise<대상줄 | null> {
  // 풀은 쓸 때 가져온다 — DATABASE_URL 없이 도는 검사가 이 파일의 순수 함수를 import 한다
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ base_url: string; login_id: string | null; login_password: string | null }>(
    'SELECT base_url, login_id, login_password FROM service_env WHERE service_id = $1 AND env = $2',
    [서비스, env],
  );
  const 행 = r.rows[0];
  return 행 === undefined
    ? null
    : { baseUrl: 행.base_url, loginId: 행.login_id, loginPassword: 행.login_password };
}

/** 로그인하려면 둘 다 필요하다 — 하나만 있는 줄은 운영 줄처럼 다룬다 (§3.6 「운영 서버 보호」) */
export function 계정있는줄(줄: 대상줄 | null): 줄 is 대상줄 {
  return 줄 !== null && (줄.loginId ?? '') !== '' && (줄.loginPassword ?? '') !== '';
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
