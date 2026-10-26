import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-062',
  name: '비밀번호를 7자로 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    passShort: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자가 든 7자').default('abc123!'),
    passMin: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자가 든 8자').default('abcd123!'),
    passMax: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자가 든 20자').default('abcdefghijklmn12345!'),
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

  await test.step('회원가입 비밀번호에 영문 · 숫자 · 특수문자 7자를 적는다', async () => {
    await 가입.비밀번호.fill(params.passShort);
    await verify('비밀번호를 7자로 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 가입.비밀번호오류.isVisible(), true);
  });

  await test.step('회원가입 비밀번호에 영문 · 숫자 · 특수문자 8자를 적는다', async () => {
    await 가입.비밀번호.fill(params.passMin);
    await verify('비밀번호를 8자로 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.비밀번호오류.isVisible(), false);
  });

  await test.step('회원가입 비밀번호에 영문 · 숫자 · 특수문자 20자를 적는다', async () => {
    await 가입.비밀번호.fill(params.passMax);
    await verify('비밀번호를 20자로 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.비밀번호오류.isVisible(), false);
  });
});
