import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 글만들기, 표식 } from './helpers/board.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-281',
  name: 'POST /api/reset 은 204 로 응답한다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 계정 = 계정값(params);
  let 글번호 = 0;

  await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
    await API로그인(request, 계정.loginId, 계정.password);
    글번호 = await 글만들기(request, { category: '자유', title: 표식('초기화 확인 글'), content: '초기화 뒤 사라져야 하는 글입니다' });
  });

  await test.step('만든 글이 조회되는지 확인한다', async () => {
    const res = await request.get(`/api/posts/${String(글번호)}`);
    await verify('초기화 전에는 만든 글이 조회된다', res.status(), 200, { blocker: true });
  });

  await test.step('글을 하나 만든 뒤 POST /api/reset 을 부른다', async () => {
    const res = await request.post('/api/reset');
    await verify('POST /api/reset 은 204 로 응답한다', res.status(), 204);
  });

  await test.step('초기화 뒤 만든 글을 GET /api/posts/{id} 로 부른다', async () => {
    const res = await request.get(`/api/posts/${String(글번호)}`);
    await verify('초기화하면 초기화 전에 만든 글이 없어진다', res.status(), 404);
  });
});
