import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-494',
  name: '아이디 칸에 12자를 적으면 12자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    idFit: z.string().describe('가입할 아이디 — 영문 소문자·숫자 12자').default('abcdefgh1234'),
    idOver: z.string().describe('가입할 아이디 — 영문 소문자·숫자 13자').default('abcdefgh12345'),
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

  await test.step('회원가입 아이디 칸에 12자를 적는다', async () => {
    await 가입.아이디.fill(params.idFit);
    await verify('아이디 칸에 12자를 적으면 12자가 다 들어간다', await 가입.값길이(가입.아이디), 12);
  });

  await test.step('회원가입 아이디 칸에 13자를 적는다', async () => {
    await 가입.아이디.fill(params.idOver);
    await verify('아이디 칸에 13자를 적으면 12자까지만 들어간다', await 가입.값길이(가입.아이디), 12);
  });
});
