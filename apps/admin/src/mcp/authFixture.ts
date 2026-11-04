// /mcp 검사가 같이 쓰는 가짜 Auth — 열쇠 묶음 · 대신 PAT 를 주는 로컬 http 서버와, 그 열쇠로 서명한 브라우저 로그인 access token

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

/** 검사의 PLATFORM_PUBLIC_URL(http://localhost:3000/) 에서 나오는 /mcp 자원 주소 */
export const 검사자원 = 'http://localhost:3000/mcp';

export interface 토큰바꿈 {
  aud?: string;
  iss?: string;
  exp?: string;
  /** 같은 kid 의 다른 열쇠로 서명한다 — 서명이 틀린 토큰 */
  남의열쇠?: boolean;
}

export interface 가짜Auth {
  issuer: string;
  대신PAT요청: { 경로: string | undefined; basic: boolean; 몸: unknown }[];
  토큰(sub: string, 바꿈?: 토큰바꿈): Promise<string>;
  닫기(): Promise<void>;
}

export async function 가짜Auth띄우기(): Promise<가짜Auth> {
  const 열쇠쌍 = await generateKeyPair('RS256');
  const 남의열쇠 = (await generateKeyPair('RS256')).privateKey;
  const jwk = { ...(await exportJWK(열쇠쌍.publicKey)), kid: 'mcp-kid', alg: 'RS256', use: 'sig' };
  const 대신PAT요청: 가짜Auth['대신PAT요청'] = [];
  const 서버 = createServer((req, res) => {
    if (req.url === '/oauth2/jwks') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ keys: [jwk] }));
    let 몸 = '';
    req.on('data', (조각: Buffer) => (몸 += 조각.toString()));
    req.on('end', () => {
      const 받은것 = JSON.parse(몸) as { userId: string };
      대신PAT요청.push({ 경로: req.url, basic: req.headers.authorization?.startsWith('Basic ') === true, 몸: 받은것 });
      const 까지 = new Date(Date.now() + 3 * 3600_000).toISOString();
      res.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify({ token: `pat_dlg_${받은것.userId}`, expiresAt: 까지 }));
    });
  });
  await new Promise<void>((풀림) => 서버.listen(0, '127.0.0.1', 풀림));
  const issuer = `http://127.0.0.1:${String((서버.address() as AddressInfo).port)}`;
  return {
    issuer,
    대신PAT요청,
    토큰: (sub, 바꿈 = {}) =>
      new SignJWT({ scope: ['commander'], preferred_username: sub })
        .setProtectedHeader({ alg: 'RS256', kid: 'mcp-kid' })
        .setIssuer(바꿈.iss ?? issuer)
        .setAudience([바꿈.aud ?? 검사자원])
        .setSubject(sub)
        .setIssuedAt()
        .setExpirationTime(바꿈.exp ?? '15m')
        .sign(바꿈.남의열쇠 === true ? 남의열쇠 : 열쇠쌍.privateKey),
    닫기: () => new Promise((풀림) => 서버.close(() => 풀림())),
  };
}
