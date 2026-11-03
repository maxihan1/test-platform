// Auth 에서 「이 사람 대신 쓸 PAT」를 받아 기억한다 — Device VISION · Issue Bunker 를 그 사람 이름으로 부른다 (SPEC 도메인/인증 §7 「대신 PAT」)

import { SSO설정읽기, type SSO설정 } from './oidc.js';

/** 사람은 Auth user id(app_user.auth_sub), 서버 몫 · 「QA Hub AI」 는 Auth username */
export type 대신누구 = { userId: string } | { username: string };

export class 대신PAT오류 extends Error {}

// 건네는 토큰이 늘 이만큼은 남게 한다 — 게임 실행의 120분 잡기가 그 안에 든다
const 새로받을ms = 2 * 60 * 60_000;
// 새로 받기가 실패했을 때 이보다 많이 남았으면 그대로 쓴다 — 부르는 도중에 끝나지 않을 만큼
const 그대로쓸ms = 60_000;
const 묻기제한ms = 10_000;

type 기억값 = { token: string; 까지: number };
const 기억 = new Map<string, 기억값>();
// 같은 사람을 동시에 여러 곳이 물어도 한 번만 받는다 — Auth 는 살아 있는 대신 PAT 가 10개면 429 를 준다
const 받는중 = new Map<string, Promise<기억값>>();

const 열쇠 = (누구: 대신누구): string => ('userId' in 누구 ? `id:${누구.userId}` : `name:${누구.username}`);
const 이름 = (누구: 대신누구): string => ('userId' in 누구 ? `userId ${누구.userId}` : `username ${누구.username}`);

async function 받기(sso: SSO설정, 누구: 대신누구, 부르기: typeof fetch): Promise<기억값> {
  // client_secret_basic 꼴 — 로그인(oidc.ts ClientSecretBasic)과 같은 비밀이다. 두 값을 먼저 URL 인코딩한다(RFC 6749 §2.3.1)
  const basic = Buffer.from(`${encodeURIComponent(sso.clientId)}:${encodeURIComponent(sso.clientSecret)}`).toString('base64');
  let res: Response;
  try {
    // whoami 처럼 Auth_platform 맨 앞 자리다 — issuer 에 경로가 붙어도 그 아래가 아니다
    res = await 부르기(new URL('/api/v1/delegated-pats', sso.issuer), {
      method: 'POST',
      headers: { authorization: `Basic ${basic}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(누구),
      signal: AbortSignal.timeout(묻기제한ms),
      // 넘겨주기를 따라가면 Basic 머리가 다른 주소로 간다
      redirect: 'manual',
    });
  } catch (err) {
    throw new 대신PAT오류(`${이름(누구)} 의 대신 PAT 를 못 받았다: Auth 에 닿지 못했다 (${err instanceof Error ? err.name : '알 수 없는 오류'})`);
  }
  const 몸 = (await res.json().catch(() => null)) as { token?: unknown; expiresAt?: unknown } | null;
  if (res.status !== 201) throw new 대신PAT오류(`${이름(누구)} 의 대신 PAT 를 못 받았다: HTTP ${res.status}`);
  const 까지 = typeof 몸?.expiresAt === 'string' ? Date.parse(몸.expiresAt) : Number.NaN;
  if (typeof 몸?.token !== 'string' || !몸.token.startsWith('pat_') || /\s/.test(몸.token) || Number.isNaN(까지)) {
    throw new 대신PAT오류(`${이름(누구)} 의 대신 PAT 답을 읽지 못했다`);
  }
  return { token: 몸.token, 까지 };
}

/**
 * 그 사람의 대신 PAT. 기억한 것이 2시간 넘게 남았으면 그것, 아니면 새로 받는다.
 * 새로 받기가 실패하면(Auth 가 잠깐 안 됨 · 429) 아직 살아 있는 것을 그대로 쓰고, 그것도 없으면 던진다. SSO 를 끈 설치도 던진다.
 * ponytail: 기억은 admin 메모리 하나다 — 다시 켜면 비어 새로 받는다. 받은 뒤 2시간 넘게 쓰는 일은 도중에 401 이다(러너 §5.2 「기억 · 수명」)
 */
export async function 대신PAT(누구: 대신누구, 부르기: typeof fetch = fetch, 지금: () => number = Date.now): Promise<string> {
  const sso = SSO설정읽기();
  if (sso === null) throw new 대신PAT오류('SSO 를 끈 설치라 대신 PAT 를 받을 Auth 가 없다');
  const k = 열쇠(누구);
  const 있던것 = 기억.get(k);
  if (있던것 !== undefined && 있던것.까지 - 지금() > 새로받을ms) return 있던것.token;

  let 받음 = 받는중.get(k);
  if (받음 === undefined) {
    받음 = 받기(sso, 누구, 부르기).finally(() => 받는중.delete(k));
    받는중.set(k, 받음);
  }
  try {
    const 새것 = await 받음;
    기억.set(k, 새것);
    return 새것.token;
  } catch (err) {
    const 남은것 = 기억.get(k);
    if (남은것 !== undefined && 남은것.까지 - 지금() > 그대로쓸ms) {
      console.error(`[delegated-pat] ${err instanceof Error ? err.message : String(err)} — 아직 살아 있는 것을 쓴다`);
      return 남은것.token;
    }
    throw err;
  }
}

/** 검사용 — 파일 · 검사 사이에 기억이 새지 않게 */
export function 대신PAT기억비우기(): void {
  기억.clear();
  받는중.clear();
}
