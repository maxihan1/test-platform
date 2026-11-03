// 브라우저가 들고 다니는 출입증(세션)을 굽고 읽는 설정. 이 파일만 쿠키를 안다 (SPEC §3.5)

import secureSession from '@fastify/secure-session';
import type { FastifyInstance } from 'fastify';

import type { 왕복값 } from './oidc.js';

declare module '@fastify/secure-session' {
  interface SessionData {
    username: string;
    /** 비밀번호 도장 — 비밀번호가 바뀌면 옛 출입증을 끊는다 (store.ts 비밀번호도장) */
    stamp: string;
    /** 로그인 방식 — maxihan 계정(SSO)으로 구운 출입증만 `sso` 다 (identify.ts) */
    method: 'sso';
    /** SSO 로그인 때 받은 id token 원문 — 로그아웃 때 Auth_platform 에 다시 내민다 (routes.ts 로그아웃) */
    idToken: string;
    /** id token 의 sid(Auth 세션 id 해시) — Auth 가 이 세션이 끝났다고 알리면 이 출입증이 끊긴다 (identify.ts · sso.ts back-channel) */
    authSid: string;
    /** SSO 출입증을 구운 시각(ms). 사람 단위로 끊긴 시각(app_user.sessions_valid_after)과 견준다 (identify.ts) */
    loginAt: number;
    /** SSO 로그인 왕복 중에만 있다 — authorize 로 보낸 state · nonce · PKCE verifier (sso.ts) */
    sso: 왕복값 & { next?: string };
  }
}

// 소금은 비밀이 아니다 — 열쇠를 늘리는 데만 쓴다. 정확히 16글자여야 한다
const 소금 = 'platform-session';

// 열쇠는 32글자를 넘어야 한다. 짧으면 부품이 기동 중에 던지므로 app.ts 가 먼저 막는다
export const 열쇠최소길이 = 32;

/** 출입증이 사는 시간(초). 구운 뒤로 칸을 고치지 않으면 이 시간 뒤 저절로 끊긴다. back-channel 로 끊긴 sid 를 이보다 조금 더 기억한다 (auth/sso.ts) */
export const 출입증수명 = 24 * 60 * 60;

/** SSO 로그인이 굽는 칸. 비밀번호 로그인 · 새 SSO 로그인이 다 지운다 — 남으면 다른 출입증이 SSO 출입증 행세를 한다 (routes.ts · sso.ts) */
export const SSO칸들 = ['method', 'idToken', 'authSid', 'loginAt'] as const;

/** 바깥 주소가 https 인 설치(운영)만 secure 를 단다. http 로 여는 맥 · 로컬 설치에 달면 브라우저가 출입증을 안 받아 아무도 못 들어온다 */
export function 쿠키설정(publicUrl = process.env.PLATFORM_PUBLIC_URL ?? '') {
  // httpOnly — 화면 스크립트가 출입증을 읽지 못하게 한다
  return { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: publicUrl.startsWith('https://') };
}

export function 세션등록(app: FastifyInstance, secret: string): void {
  app.register(secureSession, {
    secret,
    salt: 소금,
    cookieName: 'platform_session',
    expiry: 출입증수명,
    cookie: 쿠키설정(),
  });
}
