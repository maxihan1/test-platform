// maxihan 계정(Auth_platform, OIDC Provider)과 주고받는 곳. openid-client · jose 는 이 파일만 안다 — 검사가 가짜 Auth 토큰을 서명하는 mcp/authFixture.ts 는 빼고 (SPEC 도메인/인증 §3.5 「maxihan 계정」)

import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import * as oidc from 'openid-client';

export interface SSO설정 {
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** 이 플랫폼이 바깥에서 열리는 주소. 돌아올 주소(redirect URI)와 로그아웃 뒤 돌아올 주소가 이 위에 붙는다 */
  publicUrl: string;
}

/**
 * env 세 칸이 다 있으면 SSO 가 켜진 설치다. 하나도 없으면 비밀번호 로그인 그대로다.
 * **일부만 있으면 던진다** — 반만 켜지면 로그인 길이 둘 다 닫혀 아무도 못 들어온다. 기동 때(라우트 등록) 먼저 터진다
 */
export function SSO설정읽기(env: NodeJS.ProcessEnv = process.env): SSO설정 | null {
  const issuer = env.AUTH_ISSUER ?? '';
  const clientId = env.AUTH_CLIENT_ID ?? '';
  const clientSecret = env.AUTH_CLIENT_SECRET ?? '';
  const 채운수 = [issuer, clientId, clientSecret].filter((v) => v !== '').length;
  if (채운수 === 0) return null;
  if (채운수 !== 3) throw new Error('AUTH_ISSUER · AUTH_CLIENT_ID · AUTH_CLIENT_SECRET 은 셋 다 채우거나 셋 다 비워야 한다');
  const publicUrl = (env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (publicUrl === '') throw new Error('AUTH_ISSUER 를 쓰려면 PLATFORM_PUBLIC_URL 이 있어야 한다 — 돌아올 주소의 바탕이다');
  return { issuer, clientId, clientSecret, publicUrl };
}

export const 돌아올길 = '/api/auth/sso/callback';

// discovery 는 issuer 마다 한 번만 한다. 실패하면 지워서 다음 로그인 때 다시 묻는다 — Auth_platform 이 늦게 떠도 admin 을 다시 켤 필요가 없다
const 발견캐시 = new Map<string, Promise<oidc.Configuration>>();
function 발견(s: SSO설정): Promise<oidc.Configuration> {
  const 키 = `${s.issuer} ${s.clientId}`;
  let 값 = 발견캐시.get(키);
  if (값 === undefined) {
    // 로컬 Auth_platform 은 http 다. 운영 issuer 는 https 라 이 옵션이 걸리지 않는다
    const 옵션 = s.issuer.startsWith('http://') ? { execute: [oidc.allowInsecureRequests] } : undefined;
    값 = oidc.discovery(new URL(s.issuer), s.clientId, undefined, oidc.ClientSecretBasic(s.clientSecret), 옵션);
    값.catch(() => 발견캐시.delete(키));
    발견캐시.set(키, 값);
  }
  return 값;
}

/** 로그인 왕복 하나에만 쓰는 값. 출입증에 실었다가 돌아올 때 맞춰 본다 */
export interface 왕복값 {
  state: string;
  nonce: string;
  verifier: string;
}

/** 로그인 카드가 고른 갈래 — 기억한 계정으로(`loginHint`) · 다른 계정으로(`prompt: 'login'` — Auth_platform 이 세션을 끊고 다시 묻는다) */
export interface 시작갈래 {
  loginHint?: string;
  prompt?: 'login';
}

export async function 시작(s: SSO설정, 갈래: 시작갈래 = {}): Promise<{ url: string; 왕복: 왕복값 }> {
  const config = await 발견(s);
  const 왕복 = { state: oidc.randomState(), nonce: oidc.randomNonce(), verifier: oidc.randomPKCECodeVerifier() };
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: s.publicUrl + 돌아올길,
    scope: 'openid profile',
    state: 왕복.state,
    nonce: 왕복.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(왕복.verifier),
    code_challenge_method: 'S256',
    ...(갈래.loginHint === undefined ? {} : { login_hint: 갈래.loginHint }),
    ...(갈래.prompt === undefined ? {} : { prompt: 갈래.prompt }),
  });
  return { url: url.href, 왕복 };
}

export interface 받은사람 {
  sub: string;
  username: string;
  displayName: string;
  /** 로그아웃 때 Auth_platform 에 다시 내민다 (routes.ts 로그아웃) */
  idToken: string;
  /** Auth 세션 id 해시. Auth 가 이 세션이 끝났다고 알리면 그 출입증을 끊는다 (sso.ts back-channel). S23 전 Auth 는 안 싣는다 */
  sid?: string;
}

/** 돌아온 주소의 code 를 token 으로 바꾸고 id token 을 검증한다 (서명 · iss · aud · nonce · state 는 라이브러리가 본다) */
export async function 교환(s: SSO설정, 돌아온주소: URL, 왕복: 왕복값): Promise<받은사람> {
  const config = await 발견(s);
  const tokens = await oidc.authorizationCodeGrant(config, 돌아온주소, {
    pkceCodeVerifier: 왕복.verifier,
    expectedState: 왕복.state,
    expectedNonce: 왕복.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  const username = claims?.preferred_username;
  if (claims === undefined || tokens.id_token === undefined || typeof username !== 'string' || username === '') {
    throw new Error('id token 에 sub · preferred_username 이 없다');
  }
  const 이름 = typeof claims.name === 'string' && claims.name.trim() !== '' ? claims.name.trim() : username;
  const sid = typeof claims.sid === 'string' && claims.sid !== '' ? { sid: claims.sid } : {};
  return { sub: claims.sub, username, displayName: 이름, idToken: tokens.id_token, ...sid };
}

/** Auth_platform 세션까지 끊는 주소 (RP-initiated logout). 끝나면 이 플랫폼 첫 화면으로 돌아온다 — Auth 에 이 주소가 등록돼 있어야 한다 */
export async function 로그아웃주소(s: SSO설정, idToken: string): Promise<string> {
  const config = await 발견(s);
  return oidc.buildEndSessionUrl(config, { id_token_hint: idToken, post_logout_redirect_uri: s.publicUrl + '/' }).href;
}

/** 확인한 logout_token — sid 가 있으면 그 Auth 세션 하나, 없으면 그 사람(sub)이 iat + 1초 전에 시작한 세션 전부 (도메인/인증 §7 「back-channel 로그아웃」) */
export type 로그아웃알림 = { sid: string } | { sub: string; iat: number };

const 로그아웃사건 = 'http://schemas.openid.net/event/backchannel-logout';

// 열쇠 묶음은 issuer 마다 하나다 — jose 가 받아 둔 열쇠를 쓰다가 모르는 kid 가 오면 다시 받는다(30초에 한 번까지)
const 열쇠묶음 = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function 열쇠묶음읽기(s: SSO설정): ReturnType<typeof createRemoteJWKSet> {
  const 주소 = `${s.issuer}/oauth2/jwks`;
  let 열쇠 = 열쇠묶음.get(주소);
  if (열쇠 === undefined) {
    열쇠 = createRemoteJWKSet(new URL(주소));
    열쇠묶음.set(주소, 열쇠);
  }
  return 열쇠;
}

/**
 * Auth_platform 이 back-channel 로 보낸 logout_token 을 확인한다 (OIDC Back-Channel Logout 1.0 · Auth_platform S24 plan §1). 틀리면 던진다.
 * typ 을 `logout+jwt` 로 못박아야 id token · access token 을 logout_token 으로 돌려쓰지 못한다
 */
export async function 로그아웃토큰확인(s: SSO설정, token: string): Promise<로그아웃알림> {
  const { payload } = await jwtVerify(token, 열쇠묶음읽기(s), {
    issuer: s.issuer,
    audience: s.clientId,
    typ: 'logout+jwt',
    algorithms: ['RS256'],
    requiredClaims: ['iat', 'exp'],
    maxTokenAge: '5m',
    // 두 서버 시계가 조금 어긋나도 iat 가 「앞날」로 보여 버리지 않게 봐준다
    clockTolerance: 30,
  });
  const 사건 = payload.events;
  if (typeof 사건 !== 'object' || 사건 === null || !Object.hasOwn(사건, 로그아웃사건)) throw new Error('logout_token 의 events 에 back-channel 로그아웃이 없다');
  if (payload.nonce !== undefined) throw new Error('logout_token 에 nonce 가 있다');
  if (typeof payload.sid === 'string' && payload.sid !== '') return { sid: payload.sid };
  if (typeof payload.sub === 'string' && payload.sub !== '' && payload.iat !== undefined) return { sub: payload.sub, iat: payload.iat };
  throw new Error('logout_token 에 sid · sub 가 둘 다 없다');
}

/** /mcp 가 받는 access token 의 aud — Auth 설정 `auth.mcp.resource` 와 글자까지 같아야 한다 (도메인/BTS §7 「MCP」 · Auth S28) */
export const MCP자원 = (s: SSO설정): string => `${s.publicUrl}/mcp`;

/** sid 는 브라우저 로그인 때의 Auth 세션 — back-channel 로그아웃이 그 세션을 끝내면 이 토큰도 막는다(Auth 가 VISION 때문에 access token 에도 싣는다 · S26) */
export type MCP토큰답 = { sub: string; sid?: string; iat?: number } | '틀림' | '닿지못함';

// 토큰 탓이 아니라 열쇠 묶음을 못 받은 탓인 jose 오류 — 시간 끝 · 200 아닌 답 · 깨진 묶음. fetch 가 던진 것(닿지 못함)은 JOSEError 가 아니다
const 닿지못한오류 = new Set(['ERR_JOSE_GENERIC', 'ERR_JWKS_TIMEOUT', 'ERR_JWKS_INVALID']);

/**
 * Claude 가 브라우저 로그인으로 받아 온 access token(JWT)을 확인한다 (MCP 인가 2025-11-25 · Auth_platform S28).
 * **aud 가 이 창구여야 한다** — Commander 로그인(aud test-platform) · VISION(aud devicefarm) token 은 같은 Auth 가 같은 열쇠로 서명해 aud 로만 갈린다.
 * 맞으면 그 사람의 Auth id(sub = app_user.auth_sub). 열쇠 묶음을 못 받으면 '닿지못함' — 401 을 주면 Claude 가 로그인 창을 다시 띄운다
 */
export async function MCP토큰확인(s: SSO설정, token: string): Promise<MCP토큰답> {
  try {
    const { payload } = await jwtVerify(token, 열쇠묶음읽기(s), {
      issuer: s.issuer,
      audience: MCP자원(s),
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'sub'],
      clockTolerance: 30,
    });
    if (typeof payload.sub !== 'string' || payload.sub === '') return '틀림';
    return { sub: payload.sub, ...(typeof payload.sid === 'string' && payload.sid !== '' && { sid: payload.sid }), ...(payload.iat !== undefined && { iat: payload.iat }) };
  } catch (err) {
    if (err instanceof errors.JOSEError && !닿지못한오류.has(err.code)) return '틀림';
    console.error(`[mcp] Auth 열쇠 묶음(${s.issuer}/oauth2/jwks)을 받지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    return '닿지못함';
  }
}
