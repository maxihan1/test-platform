// 로그인·로그아웃·나·비밀번호 바꾸기 (SPEC 도메인/인증 §7 Auth). 가입(signup.ts)과 maxihan 계정 로그인(sso.ts)을 여기서 붙인다

import type { FastifyInstance } from 'fastify';

import { 확인 } from './identify.js';
import { SSO설정읽기, 로그아웃주소 } from './oidc.js';
import { 검증, 해시 } from './password.js';
import { 비밀번호최대, 비밀번호최소 } from './rules.js';
import signupRoutes from './signup.js';
import ssoRoutes from './sso.js';
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
  // env 가 반만 채워졌으면 여기서 던져 기동이 멈춘다 (oidc.ts)
  const sso = SSO설정읽기();

  // 로그인 화면이 어느 모양을 그릴지 묻는다. 로그인 전에 부르므로 문이 그냥 통과시킨다 (gate.ts)
  app.get('/auth/methods', async () => ({ sso: sso !== null }));

  app.post('/auth/logout', async (req, reply) => {
    const idToken = req.session.get('idToken');
    req.session.delete();
    // SSO 출입증이면 Auth_platform 세션까지 끊어야 다음 로그인에서 다시 묻는다. 화면이 이 주소로 옮겨 간다
    if (sso !== null && idToken !== undefined) return { redirect: await 로그아웃주소(sso, idToken) };
    return reply.code(204).send();
  });

  app.get('/auth/me', async (req, reply) => {
    const user = await 확인(req);
    if (user === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return { user };
  });

  // SSO 가 켜진 설치는 비밀번호 길(로그인 · 가입 · 비밀번호 바꾸기)을 아예 안 붙인다 — 부르면 404 다 (2026-10-20 사용자)
  if (sso !== null) {
    await app.register(ssoRoutes, { sso });
    return;
  }
  await app.register(signupRoutes);

  app.post<{ Body: 로그인본문 }>('/auth/login', async (req, reply) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    // 상한을 넘는 글자는 해시 계산 전에 돌려보낸다 — 로그인 없이 CPU 를 태우지 못하게. 답은 여느 401 과 같다
    const 찾은것 = username === '' || password.length > 비밀번호최대 ? null : await 로그인조회(username);
    // 아이디가 틀렸는지 비밀번호가 틀렸는지 알리지 않는다. 비활성 계정도 같은 답이다 —
    // 갈라 주면 밖에서 계정이 있는지 하나씩 확인할 수 있다 (SPEC §7)
    // maxihan 계정으로 만들어진 계정은 비밀번호가 없다 — 비밀번호 로그인에서는 없는 계정과 같은 답이다
    if (찾은것 === null || 찾은것.passwordHash === null || !(await 검증(password, 찾은것.passwordHash))) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    }
    // 비밀번호를 아는 사람에게만 갈라 준다. 그래서 계정이 있는지가 밖으로 새지 않는다 (SPEC 도메인/인증 §7)
    if (!찾은것.isApproved) return reply.code(403).send({ error: 'PENDING_APPROVAL' });

    req.session.set('username', username);
    req.session.set('stamp', 비밀번호도장(찾은것.passwordHash));
    // 앞서 SSO 로 구운 칸이 남아 있으면 SSO 를 다시 켰을 때 이 출입증이 SSO 출입증 행세를 한다
    req.session.set('method', undefined);
    req.session.set('idToken', undefined);
    return { user: 찾은것.user };
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

    const 찾은것 = currentPassword.length > 비밀번호최대 ? null : await 사용자와해시(user.username);
    if (찾은것 === null || 찾은것.passwordHash === null || !(await 검증(currentPassword, 찾은것.passwordHash))) {
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
