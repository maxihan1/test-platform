// 모든 /api/** 앞에 서는 문. 로그인했는가 · 등급이 되는가 · 배정받은 서비스인가 셋을 본다 (SPEC §7)
// 실행·카탈로그·리포팅은 이 문이 실어 준 req.user 만 읽고 비밀번호도 세션도 모른다 (§3.5)

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { 확인 } from './identify.js';
import { 경로접두사, 번호로찾을것, 서비스없음, 자원의서비스 } from './scope.js';
import type { 등급, 사용자 } from './store.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: 사용자 | null;
  }
}

const 높이: Record<등급, number> = { viewer: 0, operator: 1, admin: 2 };

function 경로(req: FastifyRequest): string {
  return req.url.split('?')[0] ?? '';
}

function 설정자리(path: string): boolean {
  return path === '/api/settings' || path.startsWith('/api/settings/');
}

// 무엇을 할 수 있는지는 §3.5 가 정본이고, 갈리는 자리는 셋이다 (§7).
// 읽기는 viewer · 바꾸는 일은 operator · 설정은 admin.
// 스캔(POST /api/catalog/scan)이 표에 이름으로 없어 방식으로 갈린다 — operator 다
function 필요등급(path: string, method: string): 등급 {
  if (설정자리(path)) return 'admin';
  return method === 'GET' || method === 'HEAD' ? 'viewer' : 'operator';
}

// 이 요청이 어느 서비스를 건드리는가. 실행 요청은 서비스를 따로 싣지 않고
// tcId 접두사에서 서버가 알아낸다 (SPEC §7)
//
// 세 갈래로 알아낸다. **번호로 부르는 자리는 DB 를 읽어야 알 수 있어** async 다.
//   ① ?service= 질의        ② 경로에 박힌 tcId 나 본문의 tcId   ③ 번호 → DB 조회
async function 닿는서비스(req: FastifyRequest, path: string): Promise<string[] | typeof 막는다> {
  if (설정자리(path)) return []; // 설정은 시스템 전체라 서비스에 매이지 않는다 (§3.5)

  const query = req.query;
  if (typeof query === 'object' && query !== null) {
    const service = (query as { service?: unknown }).service;
    if (typeof service === 'string' && service !== '') return [service];
  }

  const 경로에서 = 경로접두사(path);
  if (경로에서.length > 0) return 경로에서;

  const 찾을것 = 번호로찾을것(path);
  if (찾을것 !== null) {
    const 서비스 = await 자원의서비스(찾을것);
    // 없는 번호는 지나보낸다. 라우트가 404 를 내야 「없는 것」과 「남의 것」이 안 뭉개진다 (§7)
    if (서비스 === null) return [];
    // 있긴 한데 서비스에 안 매였다 (통합 이전 행). 어느 배정에도 안 드므로 막는다
    if (서비스 === 서비스없음) return 막는다;
    return [서비스];
  }

  if (path !== '/api/runs' || req.method !== 'POST') return [];

  const body = req.body;
  if (typeof body !== 'object' || body === null) return [];
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const 접두사들 = items
    .map((item) => (typeof item === 'object' && item !== null ? (item as { tcId?: unknown }).tcId : null))
    .filter((tcId): tcId is string => typeof tcId === 'string')
    .map((tcId) => tcId.split('-')[0] ?? '');

  return [...new Set(접두사들)].filter((prefix) => prefix !== '');
}

// 배정 목록과 맞춰 볼 이름이 없지만 열어 주면 안 되는 자원
const 막는다 = Symbol('막는다');

export function 인증등록(app: FastifyInstance): void {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req, reply) => {
    const path = 경로(req);
    if (!path.startsWith('/api/')) return;

    // 로그인 자체는 로그인을 요구할 수 없다. **이것 하나뿐이다** (SPEC §7).
    // 2026-09-17 에 POST /api/runs 예외가 삭제됐다 — 정기 실행은 HTTP 를 쓰지 않는다 (§9.2)
    if (path === '/api/auth/login') return;

    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    req.user = user;

    // 나가기와 나를 묻는 것은 등급을 따지지 않는다. 보기만 등급이 로그아웃도 못 하면 안 된다
    if (path.startsWith('/api/auth/')) return;

    const 필요 = 필요등급(path, req.method);
    if (높이[user.role] < 높이[필요]) {
      // 404로 감추지 않는다. 화면이 그 자리를 아예 안 보여주므로 여기까지 닿은 요청은
      // 화면의 버그이거나 직접 찌른 것이고, 둘 다 감추는 편이 더 나쁘다 (SPEC §7)
      return reply.code(403).send({ error: 'FORBIDDEN', need: 필요 });
    }

    const 닿는것 = await 닿는서비스(req, path);
    if (닿는것 === 막는다) {
      return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: 경로(req) });
    }

    const 배정 = new Set(user.services.map((s) => s.prefix));
    for (const prefix of 닿는것) {
      if (!배정.has(prefix)) {
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: prefix });
      }
    }
  });
}
