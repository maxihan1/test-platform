import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-240',
  name: '사용자명에 영문 · 숫자 · 밑줄 밖의 글자를 넣고 「등록하기」를 누르면 가입 요청이 나가지 않고 가입 화면에 남는다',
  precondition: ['비회원이다'],
  params: z.object({
    허용밖글자: z.string().min(1).describe('사용자명에 넣을 글자 — 영문 · 숫자 · 밑줄이 아닌 글자').default('한글이름'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);
  let 연시각 = 0;

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면 「사용자명」에 영문 · 숫자 · 밑줄 밖의 글자를 넣고 「등록하기」를 누른다', async () => {
    const 값 = 새계정값();
    await 가입.채우기({ 사용자명: params.허용밖글자, 이메일: 값.이메일, 암호: 값.암호 });
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    const 나간요청수 = await 가입.누르고나간요청수();
    const 안나감 = await verify('가입 요청이 나가지 않는다', 나간요청수, 0);
    const 남음 = await verify('가입 화면이 그대로 보인다', await 가입.제목.isVisible(), true);
    await verify('사용자명에 영문 · 숫자 · 밑줄 밖의 글자를 넣고 「등록하기」를 누르면 가입 요청이 나가지 않고 가입 화면에 남는다', 안나감 && 남음, true);
  });
});
