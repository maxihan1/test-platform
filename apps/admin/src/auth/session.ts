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
    /** SSO 로그인 왕복 중에만 있다 — authorize 로 보낸 state · nonce · PKCE verifier (sso.ts) */
    sso: 왕복값 & { next?: string };
  }
}

// 소금은 비밀이 아니다 — 열쇠를 늘리는 데만 쓴다. 정확히 16글자여야 한다
const 소금 = 'platform-session';

// 열쇠는 32글자를 넘어야 한다. 짧으면 부품이 기동 중에 던지므로 app.ts 가 먼저 막는다
export const 열쇠최소길이 = 32;

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
    cookie: 쿠키설정(),
  });
}
