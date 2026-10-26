import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 가입하기, 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-340',
  name: '입력이 틀리면 400 과 code 「VALIDATION」 · message 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    글번호: z.number().int().describe('없는 글 번호 — 어느 글에도 없는 번호').default(999999999),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('회원으로 로그인한다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('빈 본문으로 POST /api/auth/signup 을 부른다', async () => {
    const 응답 = await request.post('/api/auth/signup', { data: {} });
    const 몸 = await 몸읽기<{ code?: string; message?: string }>(응답);
    const 상태 = await verify('상태 코드가 400 이다', 응답.status(), 400);
    const 코드 = await verify('code 가 「VALIDATION」이다', 몸.code, 'VALIDATION');
    const 문구 = await verify('message 가 비어 있지 않다', typeof 몸.message === 'string' && 몸.message.length > 0, true);
    await verify('입력이 틀리면 400 과 code 「VALIDATION」 · message 로 응답한다', 상태 && 코드 && 문구, true);
  });

  await test.step('로그인 없이 GET /api/cart 를 부른다', async () => {
    const 응답 = await request.get('/api/cart');
    const 몸 = await 몸읽기<{ code?: string }>(응답);
    const 상태 = await verify('상태 코드가 401 이다', 응답.status(), 401);
    const 코드 = await verify('code 가 「UNAUTHORIZED」다', 몸.code, 'UNAUTHORIZED');
    await verify('로그인 없이 부르면 401 과 code 「UNAUTHORIZED」로 응답한다', 상태 && 코드, true);
  });

  await test.step('일반 회원으로 GET /api/admin/users 를 부른다', async () => {
    const 응답 = await page.request.get('/api/admin/users');
    const 몸 = await 몸읽기<{ code?: string }>(응답);
    const 상태 = await verify('상태 코드가 403 이다', 응답.status(), 403);
    const 코드 = await verify('code 가 「FORBIDDEN」이다', 몸.code, 'FORBIDDEN');
    await verify('권한이 없으면 403 과 code 「FORBIDDEN」으로 응답한다', 상태 && 코드, true);
  });

  await test.step('없는 글 번호로 GET /api/posts/{id} 를 부른다', async () => {
    const 응답 = await request.get(`/api/posts/${params.글번호}`);
    const 몸 = await 몸읽기<{ code?: string }>(응답);
    const 상태 = await verify('상태 코드가 404 이다', 응답.status(), 404);
    const 코드 = await verify('code 가 「NOT_FOUND」다', 몸.code, 'NOT_FOUND');
    await verify('없는 것을 부르면 404 와 code 「NOT_FOUND」로 응답한다', 상태 && 코드, true);
  });

  await test.step('이미 있는 아이디로 POST /api/auth/signup 을 부른다', async () => {
    회원 = await 일회용회원만들기(request);
    const 응답 = await 가입하기(request, 회원);
    const 몸 = await 몸읽기<{ code?: string }>(응답);
    const 상태 = await verify('상태 코드가 409 이다', 응답.status(), 409);
    const 코드 = await verify('code 가 「CONFLICT」다', 몸.code, 'CONFLICT');
    await verify('충돌이면 409 와 code 「CONFLICT」로 응답한다', 상태 && 코드, true);
  });
});
