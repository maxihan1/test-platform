// 본인 디바이스 팜 토큰 보기 · 넣기 · 지우기 (SPEC 도메인/인증 §7 「디바이스 팜 토큰」 · 도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { 확인 } from './identify.js';
import type { SSO설정 } from './oidc.js';

const 최대길이 = 200;
const 묻기제한ms = 10_000;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 주인답 = { 주인: string } | '틀림' | '닿지못함';

/** 통합계정 PAT 꼴인가 — 팜 토큰 넣기와 /mcp 가 같이 쓴다. 다른 열쇠(작성 에이전트 토큰 · cit_ · pga_)와 머리로 가른다 */
export const PAT꼴 = (토큰: string): boolean => 토큰.startsWith('pat_') && 토큰.length <= 최대길이 && !/\s/.test(토큰);

/** 팜이 토큰을 확인하는 그 문(whoami)에 묻는다. 401 은 폐기 · 기간 끝 · 틀린 값이다 */
export async function 토큰주인묻기(issuer: string, 토큰: string, 부르기: typeof fetch = fetch): Promise<주인답> {
  let res: Response;
  try {
    // whoami 는 Auth_platform 맨 앞 자리에 있다 — issuer 에 경로가 붙어도 그 아래가 아니다
    res = await 부르기(new URL('/api/v1/users/me/whoami', issuer), {
      headers: { authorization: `Bearer ${토큰}` },
      signal: AbortSignal.timeout(묻기제한ms),
    });
  } catch (err) {
    console.error(`[farm-token] Auth_platform 에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    return '닿지못함';
  }
  if (res.status === 401 || res.status === 403) return '틀림';
  const 몸 = res.ok ? ((await res.json().catch(() => null)) as { userId?: unknown; authMethod?: unknown } | null) : null;
  if (typeof 몸?.userId === 'string' && 몸.authMethod === 'pat') return { 주인: 몸.userId };
  console.error(`[farm-token] Auth_platform whoami 답을 읽지 못했다: HTTP ${res.status}`);
  return '닿지못함';
}

const 끝넷 = (토큰: string | null): { last4: string } | null => (토큰 === null ? null : { last4: 토큰.slice(-4) });

async function 계정칸(username: string): Promise<{ farmToken: string | null; authSub: string | null }> {
  const { rows } = await (await db()).query<{ farm_token: string | null; auth_sub: string | null }>(
    'SELECT farm_token, auth_sub FROM app_user WHERE username = $1',
    [username],
  );
  return { farmToken: rows[0]?.farm_token ?? null, authSub: rows[0]?.auth_sub ?? null };
}

async function 저장(username: string, 토큰: string | null): Promise<void> {
  await (await db()).query('UPDATE app_user SET farm_token = $2 WHERE username = $1', [username, 토큰]);
}

// 주인을 Auth_platform 에 묻고 auth_sub 와 견줘야 해서 SSO 가 켜진 설치에만 붙인다 (auth/routes.ts)
export default async function farmTokenRoutes(app: FastifyInstance, { sso }: { sso: SSO설정 }): Promise<void> {
  // /api/auth/** 는 문의 권한 판정을 건너뛴다. 로그인 확인을 라우트가 직접 한다. 에이전트 토큰은 토큰 통로 밖이라 문이 막는다
  app.get('/auth/farm-token', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return { farmToken: 끝넷((await 계정칸(user.username)).farmToken) };
  });

  app.put<{ Body: { token?: unknown } }>('/auth/farm-token', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const 토큰 = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!PAT꼴(토큰)) return reply.code(400).send({ error: 'FARM_TOKEN_SHAPE' });

    const 답 = await 토큰주인묻기(sso.issuer, 토큰);
    if (답 === '틀림') return reply.code(400).send({ error: 'FARM_TOKEN_INVALID' });
    if (답 === '닿지못함') return reply.code(502).send({ error: 'AUTH_UNREACHABLE' });
    // 남의 토큰을 넣으면 팜에 그 사람으로 보인다 — 이 계정에 묶인 Auth_platform 사람 것만 받는다
    if (답.주인 !== (await 계정칸(user.username)).authSub) return reply.code(400).send({ error: 'FARM_TOKEN_NOT_YOURS' });

    await 저장(user.username, 토큰);
    return { farmToken: 끝넷(토큰) };
  });

  app.delete('/auth/farm-token', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    await 저장(user.username, null);
    return reply.code(204).send();
  });
}
