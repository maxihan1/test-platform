// 모든 /api/** 앞에 서는 문. 로그인했는가 · 등급이 되는가 · 배정받은 서비스인가 셋을 본다 (SPEC §7)
// 실행·카탈로그·리포팅은 이 문이 실어 준 req.user 만 읽고 비밀번호도 세션도 모른다 (§3.5)

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { 확인 } from './identify.js';
import { 케이스의서비스, 라우트표, 번호로, 서비스없음, 자원의서비스 } from './scope.js';
import type { 등급, 사용자 } from './store.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: 사용자 | null;
  }
}

const 높이: Record<등급, number> = { viewer: 0, operator: 1, admin: 2 };

/**
 * 이 요청이 **어느 라우트로 갔는가.** 등록된 틀(`/api/settings/users`)이 그대로 온다.
 *
 * **`req.url` 을 쓰지 않는다.** 그것은 퍼센트 디코딩 **전** 원문인데, 라우터는 주소를
 * 디코딩한 뒤에 라우트를 찾는다. 그래서 글자로 판정하면 정적 구간 한 글자만 감싸도
 * 문과 라우트가 서로 다른 주소를 본다 — `/%61pi/settings/users` 가 문의 `/api/` 검사를
 * 비켜서 **로그인 없이** 전 계정 목록을 냈고, `/api/%73ettings/users` 가 설정 자리 판정을
 * 비켜서 실행까지 등급이 운영 API 를 열었다 (2026-09-19 실측).
 *
 * 틀은 디코딩과 무관한 값이라 그 틈이 애초에 생기지 않는다.
 */
function 라우트틀(req: FastifyRequest): string | undefined {
  return req.routeOptions.url;
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

// 배정 목록과 맞춰 볼 이름이 없지만 열어 주면 안 되는 요청
const 막는다 = Symbol('막는다');

// `?service=` 는 **부르는 쪽이 적는 값**이다. 라우트는 그것을 안 보고 경로의 번호로 자원을 고른다.
// 그래서 이 값 하나로 판정을 끝내면 `/api/runs/<남의번호>?service=<내것>` 이 통과한다 (2026-09-19 실측).
// 여기서 나온 것도 **합집합의 한 조각일 뿐**이고 전부 배정과 대조된다
function 질의의서비스(req: FastifyRequest): string[] {
  const query = req.query;
  if (typeof query !== 'object' || query === null) return [];
  const service = (query as { service?: unknown }).service;
  // 같은 이름을 두 번 붙이면 Fastify 가 배열로 준다. 하나만 보고 넘어가지 않는다
  const 값들 = Array.isArray(service) ? service : [service];
  return 값들.filter((v): v is string => typeof v === 'string' && v !== '');
}

// POST /api/runs 는 서비스를 따로 싣지 않는다. tcId 접두사에서 서버가 알아낸다 (SPEC §7)
function 본문의서비스(req: FastifyRequest): string[] | typeof 막는다 {
  const body = req.body;
  if (typeof body !== 'object' || body === null) return [];
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const 접두사들: string[] = [];
  for (const item of items) {
    const tcId = typeof item === 'object' && item !== null ? (item as { tcId?: unknown }).tcId : null;
    const 서비스 = 케이스의서비스(tcId);
    // 모양이 아닌 케이스 번호가 섞여 있다. 어느 서비스인지 모르는 채로 지나보내지 않는다
    if (서비스 === null) return 막는다;
    접두사들.push(서비스);
  }
  return [...new Set(접두사들)];
}

/**
 * 이 요청이 어느 서비스를 건드리는가.
 *
 * **먼저 걸린 것으로 끝내지 않는다 — 나온 것을 전부 모아 배정과 대조한다.**
 * 갈래가 여럿인데 하나만 보면 나머지가 그 하나에 가려진다.
 *
 * **모르면 막는다.** 등록된 틀이 `라우트표` 에 없으면 그것은 「서비스에 안 매인다」가 아니라
 * 「아무도 분류하지 않았다」이고, 그 기본값이 열림이면 새 라우트가 조용히 뚫린다.
 */
async function 닿는서비스(req: FastifyRequest): Promise<string[] | typeof 막는다> {
  const 틀 = req.routeOptions.url;
  const 원천 = 틀 === undefined ? undefined : 라우트표[틀];
  if (원천 === undefined) return 막는다;

  // **그 라우트가 실제로 `?service=` 를 쓰는 경우에만** 본다.
  // 안 쓰는 라우트에서까지 쿼리를 읽으면 부르는 쪽이 적은 값이 자원 판정을 가린다
  const 모인것 = 원천.종류 === '질의' ? 질의의서비스(req) : [];

  // 주소에서 읽는 값은 **라우트가 받은 것과 같은 값**이어야 한다.
  // req.url 글자를 파싱하면 퍼센트 인코딩·느슨한 숫자에서 라우트와 갈린다
  const params = req.params as Record<string, unknown>;

  if (원천.종류 === '케이스') {
    const 서비스 = 케이스의서비스(params[원천.칸]);
    if (서비스 === null) return 막는다;
    모인것.push(서비스);
  }

  if (
    원천.종류 === '실행' ||
    원천.종류 === '증적' ||
    원천.종류 === '입력값묶음' ||
    원천.종류 === '작성요청'
  ) {
    const 번호 = 번호로(params[원천.칸]);
    // 라우트는 이 값을 숫자로 읽는다. 문이 못 읽는 모양이면 둘이 다른 것을 보고 있다
    if (번호 === null) return 막는다;

    const 서비스 = await 자원의서비스({ 종류: 원천.종류, 번호 });
    // 없는 번호는 지나보낸다. 라우트가 404 를 내야 「없는 것」과 「남의 것」이 안 뭉개진다 (§7)
    // 있긴 한데 서비스에 안 매였으면(통합 이전 행) 어느 배정에도 안 드므로 막는다
    if (서비스 === 서비스없음) return 막는다;
    if (서비스 !== null) 모인것.push(서비스);
  }

  if (틀 === '/api/runs' && req.method === 'POST') {
    const 본문 = 본문의서비스(req);
    if (본문 === 막는다) return 막는다;
    모인것.push(...본문);
  }

  return [...new Set(모인것)];
}

export function 인증등록(app: FastifyInstance): void {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req, reply) => {
    // 라우트가 안 잡힌 요청은 지킬 자원이 없다. 라우터가 404 를 내게 둔다
    const path = 라우트틀(req);
    if (path === undefined || !path.startsWith('/api/')) return;

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

    const 닿는것 = await 닿는서비스(req);
    if (닿는것 === 막는다) {
      return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: path });
    }

    const 배정 = new Set(user.services.map((s) => s.prefix));
    for (const prefix of 닿는것) {
      if (!배정.has(prefix)) {
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: prefix });
      }
    }
  });
}
