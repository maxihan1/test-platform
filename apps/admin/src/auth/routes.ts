// 로그인·로그아웃·나·비밀번호 바꾸기 (SPEC 도메인/인증 §7 Auth)

import type { FastifyInstance } from 'fastify';

import { 확인 } from './identify.js';
import { 검증, 해시 } from './password.js';
import { 비밀번호최대, 비밀번호최소 } from './rules.js';
import { 로그인조회, 비밀번호도장, 비밀번호바꾸기, 사용자와해시 } from './store.js';

interface 로그인본문 {
  username?: unknown;
  password?: unknown;
}

interface 비밀번호본문 {
  currentPassword?: unknown;
  newPassword?: unknown;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: 로그인본문 }>('/auth/login', async (req, reply) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const 찾은것 = username === '' ? null : await 로그인조회(username);
    // 아이디가 틀렸는지 비밀번호가 틀렸는지 알리지 않는다. 비활성 계정도 같은 답이다 —
    // 갈라 주면 밖에서 계정이 있는지 하나씩 확인할 수 있다 (SPEC §7)
    if (찾은것 === null || !(await 검증(password, 찾은것.passwordHash))) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    }
    // 비밀번호를 아는 사람에게만 갈라 준다. 그래서 계정이 있는지가 밖으로 새지 않는다 (SPEC 도메인/인증 §7)
    if (!찾은것.isApproved) return reply.code(403).send({ error: 'PENDING_APPROVAL' });

    req.session.set('username', username);
    req.session.set('stamp', 비밀번호도장(찾은것.passwordHash));
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

  // /api/auth/** 는 문의 권한 판정을 건너뛴다. 그래서 로그인 확인을 이 라우트가 직접 한다.
  // 토큰 요청은 문이 onRequest 에서 이미 막았다 (토큰 통로 밖)
  app.post<{ Body: 비밀번호본문 }>('/auth/password', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });

    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length > 비밀번호최대) {
      return reply.code(400).send({ error: 'INVALID_REQUEST' });
    }
    if (newPassword.length < 비밀번호최소) return reply.code(400).send({ error: 'PASSWORD_SHORT' });

    const 찾은것 = await 사용자와해시(user.username);
    if (찾은것 === null || !(await 검증(currentPassword, 찾은것.passwordHash))) {
      return reply.code(400).send({ error: 'INVALID_CREDENTIALS' });
    }
    // 변경 강제를 같은 값으로 통과하지 못하게 한다 (SPEC 도메인/인증 §7)
    if (newPassword === currentPassword) return reply.code(400).send({ error: 'PASSWORD_SAME' });

    const 새해시 = await 해시(newPassword);
    await 비밀번호바꾸기(user.username, 새해시);
    // 다른 출입증은 옛 도장이라 끊기고, 바꾼 본인만 새 도장으로 이어진다 (SPEC 도메인/인증 §7)
    req.session.set('stamp', 비밀번호도장(새해시));
    return reply.code(204).send();
  });
}
