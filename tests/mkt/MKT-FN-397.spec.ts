import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-397',
  name: '비로그인 좋아요 요청은 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    글번호: z.number().int().min(1).describe('좋아요를 보낼 글 번호 — 서버에 있는 글').default(48),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('로그인 없이 좋아요 요청을 보낸다', async () => {
    const 응답 = await request.post(`/api/posts/${params.글번호}/like`);
    await verify('비로그인 좋아요 요청은 401 로 응답한다', 응답.status(), 401);
  });
});
