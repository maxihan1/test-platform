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

/**
 * 옛 자동 규칙. **표로 갈아탄 뒤에도 남긴다** — `gate.test.ts` 가 서른여덟 쌍 전부를
 * 표와 대조해 **의도하지 않은 등급 변경**을 잡는 데 쓴다 (2026-09-22 검토가 잡았다).
 *
 * 손으로 서른여덟 줄을 옮겨 적는 일이라 한 줄만 틀려도 된다. 틀린 방향 둘이 값이 다르다 —
 * 보기만을 실행으로 적으면 **목록을 못 읽어 시끄럽고**, 실행을 보기만으로 적으면
 * **보기만 등급이 실행을 거는데 403 이 안 나 아무도 안 빨개진다.**
 *
 * **지우지 마라.** 이것이 없으면 대조할 기준이 사라진다.
 */
export function 옛자동규칙(path: string, method: string): 등급 {
  if (path === '/api/settings' || path.startsWith('/api/settings/')) return 'admin';
  return method === 'GET' || method === 'HEAD' ? 'viewer' : 'operator';
}

/** 등급을 안 따지는 자리. 문이 그 앞에서 이미 돌려보낸다 */
const 안따짐 = '안따짐';
type 표값 = 등급 | typeof 안따짐;

/**
 * **경로→등급 표** (SPEC 도메인/인증 §7 「등급으로 갈리는 자리」가 정본이다).
 *
 * ★ **키는 「틀 + 메서드」다.** 한 틀이 메서드마다 다른 등급을 갖는 자리가 실제로 있다 —
 * `/api/catalog/scan` · `/api/runs` · `/api/cases/:tcId/param-sets` 셋이 `GET` 과 쓰기로 갈린다.
 * 틀 하나로 잡으면 셋이 한 값으로 뭉개진다.
 *
 * ★ **표에 없으면 `admin` 이다** — `scope.ts` 의 「모르면 막는다」와 같은 방향이다.
 * 새 통로를 낼 때마다 그 자리에서 403 으로 빨개진다. 시끄럽지만 안전하다.
 */
export const 등급표: Record<string, 표값> = {
  // 로그인·로그아웃·나를 묻기는 문이 등급 판정 앞에서 돌려보낸다.
  // 보기만 등급이 로그아웃도 못 하면 안 된다 (아래 인증등록 참조)
  'POST /api/auth/login': 안따짐,
  'POST /api/auth/logout': 안따짐,
  'GET /api/auth/me': 안따짐,

  // 읽기 — viewer
  'GET /api/catalog/cases': 'viewer',
  'GET /api/catalog/cases/:tcId': 'viewer',
  'GET /api/catalog/scan': 'viewer',
  'GET /api/cases/:tcId/history': 'viewer',
  'GET /api/cases/:tcId/param-sets': 'viewer',
  'GET /api/cases/:tcId/source': 'viewer',
  'GET /api/evidence/:id': 'viewer',
  'GET /api/runs': 'viewer',
  'GET /api/runs/last-by-case': 'viewer',
  'GET /api/runs/:runId': 'viewer',
  'GET /api/runs/:runId/insights': 'viewer',
  'GET /api/runs/:runId/items/:historyId': 'viewer',
  'GET /api/runs/:runId/progress': 'viewer',
  'GET /api/screenshots/:runId/:historyId/:seq.png': 'viewer',
  'GET /api/authoring/requests': 'viewer',
  'GET /api/authoring/requests/:id': 'viewer',

  // 바꾸는 일 — operator
  'POST /api/catalog/scan': 'operator',
  'POST /api/runs': 'operator',
  'POST /api/runs/:runId/abort': 'operator',
  'POST /api/runs/:runId/evidence': 'operator',
  'POST /api/cases/:tcId/param-sets': 'operator',
  'DELETE /api/param-sets/:id': 'operator',
  'POST /api/authoring/requests': 'operator',
  'POST /api/authoring/requests/claim': 'operator',
  'PATCH /api/authoring/requests/:id/stage': 'operator',
  'POST /api/authoring/requests/:id/screenshots': 'operator',
  'POST /api/authoring/requests/:id/finish': 'operator',

  // ★ 저장소를 영구히 바꾸는 일 — admin. **이 PR 이 일부러 바꾸는 유일한 줄이다**
  'POST /api/authoring/merges': 'admin',

  // 설정 — admin
  'GET /api/settings/services': 'admin',
  'POST /api/settings/services': 'admin',
  'PATCH /api/settings/services/:id': 'admin',
  'GET /api/settings/users': 'admin',
  'POST /api/settings/users': 'admin',
  'PATCH /api/settings/users/:username': 'admin',
  'POST /api/settings/users/:username/password': 'admin',
};

function 필요등급(path: string, method: string): 등급 {
  // Fastify 는 GET 라우트에 HEAD 를 자동으로 붙인다. 소스에는 그 줄이 없어 표에도 없고,
  // 그대로 두면 HEAD 가 admin 으로 떨어져 **오늘 viewer 가 하던 일이 조용히 막힌다**
  const 키 = `${method === 'HEAD' ? 'GET' : method} ${path}`;
  const 값 = 등급표[키];
  // 표에 없거나 「안 따짐」인데 여기까지 왔으면 아무도 분류하지 않은 것이다. 막는 쪽으로 간다
  return 값 === undefined || 값 === 안따짐 ? 'admin' : 값;
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

  /**
   * **로그인 검사는 본문을 읽기 전에 한다.**
   *
   * `preHandler` 는 본문 파서가 **다 읽은 뒤**에 돈다. 그래서 거기에만 두면
   * **로그인하지 않은 사람이 보낸 큰 본문이 메모리에 통째로 올라간 다음에야** 401 이 나간다 —
   * 사진 올리는 통로처럼 상한이 넓은 자리에서는 그것만으로 서버를 넘길 수 있다
   * (2026-09-22 보안 검토가 실측으로 잡았다).
   *
   * **등급과 서비스 판정은 여기서 안 한다** — 그 판정이 `POST /api/runs` 의 **본문**을 읽어야 해서
   * 이 단계에서는 값이 아직 없다. 그래서 둘로 나눈다. 이 단계는 **누구인가**만 본다.
   */
  app.addHook('onRequest', async (req, reply) => {
    const path = 라우트틀(req);
    if (path === undefined || !path.startsWith('/api/')) return;

    // 로그인 자체는 로그인을 요구할 수 없다. **이것 하나뿐이다** (SPEC §7).
    // 2026-09-17 에 POST /api/runs 예외가 삭제됐다 — 정기 실행은 HTTP 를 쓰지 않는다 (§9.2)
    if (path === '/api/auth/login') return;

    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    req.user = user;
  });

  app.addHook('preHandler', async (req, reply) => {
    // 라우트가 안 잡힌 요청은 지킬 자원이 없다. 라우터가 404 를 내게 둔다
    const path = 라우트틀(req);
    if (path === undefined || !path.startsWith('/api/')) return;
    if (path === '/api/auth/login') return;

    // 위 onRequest 가 이미 401 을 냈다. 여기 닿았으면 사람이 실려 있다
    const user = req.user;
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });

    // 나가기와 나를 묻는 것은 등급을 따지지 않는다. 보기만 등급이 로그아웃도 못 하면 안 된다.
    // ★ **이 아래(`/api/auth/**`)에는 등급이 안 걸린다.** 여기에 통로를 더하면
    // 등급 표에 「안 따짐」으로 적히고 **로그인만 했으면 보기만 등급도 통과**한다 —
    // 표를 보면 안전해 보이는데 실제 판정은 이 한 줄이 한다 (2026-09-22 보안 검토가 잡았다)
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
