import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-096',
  name: '아이디와 비밀번호를 다 적으면 「로그인」 버튼이 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    typedId: z.string().describe('로그인 화면에 적을 아이디').default('demo1234'),
    typedPass: z.string().describe('로그인 화면에 적을 비밀번호').default('Demo1234!'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  await 안내창막기(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 아이디와 비밀번호를 다 적는다', async () => {
    await 로그인.적기(params.typedId, params.typedPass);
    await verify('아이디와 비밀번호를 다 적으면 「로그인」 버튼이 눌린다', await 로그인.로그인버튼.isEnabled(), true);
  });
});
