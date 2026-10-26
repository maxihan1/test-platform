import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-495',
  name: '비밀번호 칸에 20자를 적으면 20자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    passFit: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자가 든 20자').default('abcdefghijklmn12345!'),
    passOver: z.string().describe('가입할 비밀번호 — 영문·숫자·특수문자가 든 21자').default('abcdefghijklmn123456!'),
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

  await test.step('회원가입 비밀번호 칸에 20자를 적는다', async () => {
    await 가입.비밀번호.fill(params.passFit);
    await verify('비밀번호 칸에 20자를 적으면 20자가 다 들어간다', await 가입.값길이(가입.비밀번호), 20);
  });

  await test.step('회원가입 비밀번호 칸에 21자를 적는다', async () => {
    await 가입.비밀번호.fill(params.passOver);
    await verify('비밀번호 칸에 21자를 적으면 20자까지만 들어간다', await 가입.값길이(가입.비밀번호), 20);
  });
});
