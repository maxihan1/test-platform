// 로그인·로그아웃·나 세 엔드포인트 (SPEC §7 Auth). 회원가입은 없다 — 계정은 운영자가 만든다 (§8.6)

import type { FastifyInstance } from 'fastify';

import { 확인 } from './identify.js';
import { 검증 } from './password.js';
import { 사용자와해시 } from './store.js';

interface 로그인본문 {
  username?: unknown;
  password?: unknown;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: 로그인본문 }>('/auth/login', async (req, reply) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const 찾은것 = username === '' ? null : await 사용자와해시(username);
    // 아이디가 틀렸는지 비밀번호가 틀렸는지 알리지 않는다. 비활성 계정도 같은 답이다 —
    // 갈라 주면 밖에서 계정이 있는지 하나씩 확인할 수 있다 (SPEC §7)
    if (찾은것 === null || !(await 검증(password, 찾은것.passwordHash))) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    }

    req.session.set('username', username);
    return { user: 찾은것.user };
  });

  app.post('/auth/logout', async (req, reply) => {
    req.session.delete();
    return reply.code(204).send();
  });

  app.get('/auth/me', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return { user };
  });
}
