// /grafana/** 앞에 서는 문. 로그인 · 변경 강제 아님 · (대시보드, read) 를 본 뒤에야 proxy 가 넘긴다 (SPEC 도메인/인증 §7 「Grafana 통로」)

import type { FastifyReply, FastifyRequest } from 'fastify';

import { 확인 } from './identify.js';

/** 등록된 틀로 판정한다 — 요청 글자로 보면 `/%67rafana/` 가 비킨다 (gate.ts 라우트틀) */
export function 그라파나틀인가(틀: string): boolean {
  return 틀 === '/grafana' || 틀.startsWith('/grafana/');
}

// 라우터가 디코딩한 와일드카드 값이다. `/grafana/%61pi/…` 도 여기서는 `api/…` 로 보인다
function 그라파나api인가(req: FastifyRequest): boolean {
  const 나머지 = (req.params as { '*'?: unknown })['*'];
  return typeof 나머지 === 'string' && (나머지 === 'api' || 나머지.startsWith('api/'));
}

function 로그인안함(req: FastifyRequest, reply: FastifyReply) {
  // 화면을 여는 GET 만 로그인 화면으로 보낸다. 뒤에서 부르는 API 에 HTML 을 주면 Grafana 화면이 조용히 깨진다
  const 화면인가 = (req.method === 'GET' || req.method === 'HEAD') && !그라파나api인가(req);
  if (!화면인가) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
  // 화면은 next 가 /grafana/ 로 시작할 때만 받는다. 그 모양이 아닌 원문은 첫 화면으로 돌린다
  const 돌아올곳 = req.url.startsWith('/grafana/') ? req.url : '/grafana/';
  return reply.redirect(`/?next=${encodeURIComponent(돌아올곳)}#/login`, 302);
}

export async function 그라파나문(req: FastifyRequest, reply: FastifyReply) {
  const authorization = req.headers.authorization;
  // 에이전트 토큰은 대시보드 통로가 없다. Basic 같은 다른 값은 proxy 가 지우고 세션으로만 판정한다
  if (authorization?.startsWith('Bearer ')) return reply.code(403).send({ error: 'AGENT_TOKEN_SCOPE' });

  // 헤더를 넘기지 않는다 — 넘기면 Basic 값이 「틀린 토큰」으로 읽혀 세션이 있어도 로그인 안 한 것이 된다
  const user = await 확인({ session: req.session });
  if (user === null) return 로그인안함(req, reply);
  if (user.mustChangePassword) return reply.code(403).send({ error: 'PASSWORD_CHANGE_REQUIRED' });
  if (user.dashboard === 'none') return reply.code(403).send({ error: 'FORBIDDEN', need: 'dashboard:read' });
  req.user = user;
}
