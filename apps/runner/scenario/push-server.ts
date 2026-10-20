// E2E 「가입 → 기기 등록 → 주문 → 푸시 확인」 실측용 가짜 쇼핑몰 · 알림 서버 — 데모마켓 알림 서버(REQ-NTF-004 · 006 · 013)의 몇 줄만 흉내 낸다 (apps/runner/scenario/push-e2e.test.ts)
// 주문하면 그 회원 아이디로 등록된 기기가 있을 때만 푸시 이력이 남는다. 알림 쪽은 Bearer 토큰이 없으면 401 이다

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export const 클라이언트 = { id: 'demomarket', secret: 'dm-notify-secret' };

export interface 푸시서버 {
  쇼핑몰: string;
  알림: string;
  기기: Map<string, { id: string; userId: string }>;
  받은인증: string[];                        // 알림 쪽이 받은 Authorization 머리
  닫기(): Promise<void>;
}

type 처리 = (method: string, path: string, body: string, req: IncomingMessage) => { status: number; body?: unknown; 머리?: Record<string, string> };

async function 열기(처리: 처리) {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => {
      body += c;
    });
    req.on('end', () => {
      const r = 처리(req.method ?? 'GET', req.url ?? '/', body, req);
      res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8', ...r.머리 });
      res.end(r.body === undefined ? '' : JSON.stringify(r.body));
    });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, 닫기: () => new Promise<void>((done) => server.close(() => done())) };
}

export async function 푸시서버열기(): Promise<푸시서버> {
  const 회원 = new Map<string, string>();       // loginId → password
  const 세션 = new Map<string, string>();       // sid → loginId
  const 기기 = new Map<string, { id: string; userId: string }>();
  const 푸시: Array<{ userId: string; title: string }> = [];
  const 토큰 = new Set<string>();
  const 받은인증: string[] = [];
  let 번호 = 1;
  const 읽기 = (body: string) => (body === '' ? {} : (JSON.parse(body) as Record<string, string>));

  const 쇼핑몰 = await 열기((method, path, body, req) => {
    const sid = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    if (method === 'GET' && path === '/') return { status: 200, body: {} };
    if (method === 'POST' && path === '/api/auth/signup') {
      const b = 읽기(body);
      회원.set(b.loginId ?? '', b.password ?? '');
      return { status: 201, body: { loginId: b.loginId, name: b.name } };
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const b = 읽기(body);
      if (회원.get(b.loginId ?? '') !== b.password) return { status: 401, body: { code: 'LOGIN_FAILED' } };
      const 새sid = `s${번호++}`;
      세션.set(새sid, b.loginId ?? '');
      return { status: 200, body: { loginId: b.loginId }, 머리: { 'set-cookie': `sid=${새sid}; Path=/` } };
    }
    if (method === 'POST' && path === '/api/orders') {
      const loginId = sid === undefined ? undefined : 세션.get(sid);
      if (loginId === undefined) return { status: 401, body: {} };
      const id = `DM-${번호++}`;
      // REQ-NTF-013 — 그 아이디로 등록된 기기가 있을 때만 보낸다
      if ([...기기.values()].some((d) => d.userId === loginId)) 푸시.unshift({ userId: loginId, title: '주문이 완료되었습니다' });
      return { status: 201, body: { id, total: 23000 } };
    }
    return { status: 404, body: {} };
  });

  const 알림 = await 열기((method, path, body, req) => {
    const u = new URL(path, 'http://x');
    if (method === 'POST' && u.pathname === '/v1/oauth/token') {
      const basic = Buffer.from(`${클라이언트.id}:${클라이언트.secret}`).toString('base64');
      if (req.headers.authorization !== `Basic ${basic}` || !body.includes('grant_type=client_credentials')) return { status: 401, body: { error: 'invalid_client' } };
      const t = `tok-${번호++}`;
      토큰.add(t);
      return { status: 200, body: { access_token: t, token_type: 'Bearer', expires_in: 300 } };
    }
    받은인증.push(req.headers.authorization ?? '');
    if (!토큰.has((req.headers.authorization ?? '').replace(/^Bearer /, ''))) return { status: 401, body: { code: 'UNAUTHORIZED' } };
    if (method === 'POST' && u.pathname === '/v1/devices') {
      const b = 읽기(body);
      const d = { id: `dev-${번호++}`, userId: b.userId ?? '' };
      기기.set(d.id, d);
      return { status: 201, body: d };
    }
    const 기기자리 = /^\/v1\/devices\/([^/]+)$/.exec(u.pathname);
    if (method === 'DELETE' && 기기자리 !== null) {
      return 기기.delete(decodeURIComponent(기기자리[1] ?? '')) ? { status: 204 } : { status: 404, body: { code: 'NOT_FOUND' } };
    }
    if (method === 'GET' && u.pathname === '/v1/pushes') {
      const items = 푸시.filter((p) => p.userId === u.searchParams.get('userId'));
      return { status: 200, body: { items, total: items.length } };
    }
    return { status: 404, body: {} };
  });

  return {
    쇼핑몰: 쇼핑몰.url,
    알림: 알림.url,
    기기,
    받은인증,
    닫기: async () => {
      await 쇼핑몰.닫기();
      await 알림.닫기();
    },
  };
}
