// 브라우저가 들고 다니는 출입증(세션)을 굽고 읽는 설정. 이 파일만 쿠키를 안다 (SPEC §3.5)

import secureSession from '@fastify/secure-session';
import type { FastifyInstance } from 'fastify';

declare module '@fastify/secure-session' {
  interface SessionData {
    username: string;
  }
}

// 소금은 비밀이 아니다 — 열쇠를 늘리는 데만 쓴다. 정확히 16글자여야 한다
const 소금 = 'platform-session';

export async function 세션등록(app: FastifyInstance, secret: string): Promise<void> {
  await app.register(secureSession, {
    secret,
    salt: 소금,
    cookieName: 'platform_session',
    // httpOnly — 화면 스크립트가 출입증을 읽지 못하게 한다
    cookie: { path: '/', httpOnly: true, sameSite: 'lax' },
  });
}
