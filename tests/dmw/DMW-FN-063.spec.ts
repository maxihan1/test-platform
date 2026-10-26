import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-063',
  name: '비밀번호에 특수문자가 없으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    passPlain: z.string().describe('가입할 비밀번호 — 영문과 숫자만 든 8~20자, 특수문자 없음').default('abcd1234'),
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

  await test.step('회원가입 비밀번호에 특수문자 없이 「abcd1234」를 적는다', async () => {
    await 가입.비밀번호.fill(params.passPlain);
    await verify('비밀번호에 특수문자가 없으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 가입.비밀번호오류.isVisible(), true);
  });
});
