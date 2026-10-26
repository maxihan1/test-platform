import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-065',
  name: '비밀번호 확인을 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    passBase: z.string().describe('가입할 비밀번호 — 비밀번호 확인과 견주는 값').default('abcd1234!'),
    passDiff: z.string().describe('비밀번호 확인에 적을 값 — 가입할 비밀번호와 다른 값').default('abcd1234?'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호 확인에 비밀번호와 다른 값을 적는다', async () => {
    await 가입.비밀번호.fill(params.passBase);
    await 가입.비밀번호확인.fill(params.passDiff);
    await verify('비밀번호 확인을 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다', await 가입.비밀번호확인오류.isVisible(), true);
  });
});
