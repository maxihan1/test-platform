// 시나리오 실측용 작은 HTTP 서버 — 받은 요청을 순서대로 적고 로그인 · 글 · 장바구니만 흉내 낸다 (apps/runner/scenario/e2e.test.ts · SETUP 「러너 이미지로 시나리오 한 바퀴」)
// 인터넷 없이 미룬 삭제가 언제 · 어떤 쿠키로 왔는지를 서버 쪽에서 본다. 혼자 띄울 때는 `npx tsx apps/runner/scenario/e2e-server.ts <포트> [바인드 주소]`

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

export interface 받은요청 {
  method: string;
  path: string;
  로그인: boolean;
  body: string;
}

export interface 실측서버 {
  url: string;
  기록: 받은요청[];
  닫기(): Promise<void>;
}

const 화면 = '<!doctype html><meta charset="utf-8"><h1 id="t">화면</h1>';

export async function 서버열기(port = 0, host = '127.0.0.1'): Promise<실측서버> {
  const 기록: 받은요청[] = [];
  const 글 = new Map<number, unknown>();
  let 다음번호 = 812;

  const server = createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      const method = req.method ?? 'GET';
      const path = req.url ?? '/';
      const 로그인 = /(?:^|;\s*)sid=xsf(?:;|$)/.test(req.headers.cookie ?? '');
      기록.push({ method, path, 로그인, body });

      const 보냄 = (status: number, 값: unknown, 머리: Record<string, string> = {}) => {
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...머리 });
        res.end(JSON.stringify(값));
      };
      const 글자리 = /^\/api\/posts\/(\d+)$/.exec(path);
      const 번호 = 글자리 === null ? undefined : Number(글자리[1]);

      if (method === 'GET' && path === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(화면);
      } else if (method === 'POST' && path === '/api/login') {
        보냄(200, { ok: true }, { 'set-cookie': 'sid=xsf; Path=/' });
      } else if (method === 'POST' && path === '/api/posts') {
        const id = 다음번호++;
        글.set(id, { id, ...(JSON.parse(body || '{}') as object) });
        보냄(201, { id });
      } else if (번호 !== undefined && method === 'GET') {
        // 로그인 상태가 다음 부품의 request 까지 넘어왔는지 보려고 읽기는 로그인을 요구한다
        if (!로그인) 보냄(401, {});
        else if (!글.has(번호)) 보냄(404, {});
        else 보냄(200, 글.get(번호));
      } else if (번호 !== undefined && method === 'PUT') {
        if (!글.has(번호)) 보냄(404, {});
        else {
          글.set(번호, { id: 번호, ...(JSON.parse(body || '{}') as object) });
          보냄(200, 글.get(번호));
        }
      } else if (번호 !== undefined && method === 'DELETE') {
        // 미룬 삭제가 모을 때의 로그인 상태로 나갔는지 본다
        if (!로그인) 보냄(401, {});
        else {
          글.delete(번호);
          보냄(200, {});
        }
      } else if (method === 'DELETE' && path === '/api/cart') {
        보냄(200, { 비움: true });
      } else {
        보냄(404, {});
      }
    });
  });

  await new Promise<void>((done) => server.listen(port, host, done));
  const { port: 열린포트 } = server.address() as AddressInfo;
  return {
    url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${열린포트}`,
    기록,
    닫기: () => new Promise<void>((done, fail) => server.close((err) => (err ? fail(err) : done()))),
  };
}

// 러너 이미지 한 바퀴는 컨테이너가 이 서버에 닿아야 해서 고정 포트로 혼자 띄운다. 리눅스 도커는 0.0.0.0 에 열어야 닿는다
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const 서버 = await 서버열기(Number(process.argv[2] ?? 4098), process.argv[3] ?? '127.0.0.1');
  console.log(`실측 서버가 ${서버.url} 에 떴다`);
  setInterval(() => {
    while (서버.기록.length > 0) console.log(JSON.stringify(서버.기록.shift()));
  }, 500);
}
