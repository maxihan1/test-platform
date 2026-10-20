// maxihan 계정(Auth_platform, OIDC Provider)과 주고받는 곳. openid-client 는 이 파일만 안다 (SPEC 도메인/인증 §3.5 「maxihan 계정」)

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

export async function 시작(s: SSO설정): Promise<{ url: string; 왕복: 왕복값 }> {
  const config = await 발견(s);
  const 왕복 = { state: oidc.randomState(), nonce: oidc.randomNonce(), verifier: oidc.randomPKCECodeVerifier() };
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: s.publicUrl + 돌아올길,
    scope: 'openid profile',
    state: 왕복.state,
    nonce: 왕복.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(왕복.verifier),
    code_challenge_method: 'S256',
  });
  return { url: url.href, 왕복 };
}

export interface 받은사람 {
  sub: string;
  username: string;
  displayName: string;
  idToken: string;
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
  return { sub: claims.sub, username, displayName: 이름, idToken: tokens.id_token };
}

/** Auth_platform 의 SSO 세션까지 끊는 주소 (RP-initiated logout). 끝나면 이 플랫폼 첫 화면으로 돌아온다 */
export async function 로그아웃주소(s: SSO설정, idToken: string): Promise<string> {
  const config = await 발견(s);
  return oidc.buildEndSessionUrl(config, { id_token_hint: idToken, post_logout_redirect_uri: s.publicUrl + '/' }).href;
}
