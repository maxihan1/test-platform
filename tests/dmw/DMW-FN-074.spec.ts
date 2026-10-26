import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-074',
  name: '휴대폰 칸에 「abc12-3」을 적으면 숫자 「123」만 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    mixedPhone: z.string().describe('가입할 휴대폰 — 숫자 1 · 2 · 3 사이에 다른 글자가 섞인 11자 이하, 숫자만 남기면 123').default('abc12-3'),
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

  await test.step('회원가입 휴대폰에 「abc12-3」을 적는다', async () => {
    await 가입.휴대폰.fill(params.mixedPhone);
    await verify('휴대폰 칸에 「abc12-3」을 적으면 숫자 「123」만 들어간다', await 가입.휴대폰.inputValue(), '123');
  });
});
