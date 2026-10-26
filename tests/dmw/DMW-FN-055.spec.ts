import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-055',
  name: '아이디를 3자로 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    idShort: z.string().describe('가입할 아이디 — 영문 소문자·숫자 3자').default('abc'),
    idMin: z.string().describe('가입할 아이디 — 영문 소문자·숫자 4자').default('abcd'),
    idMax: z.string().describe('가입할 아이디 — 영문 소문자·숫자 12자').default('abcdefgh1234'),
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

  await test.step('회원가입 아이디에 3자 「abc」를 적는다', async () => {
    await 가입.아이디.fill(params.idShort);
    await verify('아이디를 3자로 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다', await 가입.아이디오류.isVisible(), true);
  });

  await test.step('회원가입 아이디에 4자 「abcd」를 적는다', async () => {
    await 가입.아이디.fill(params.idMin);
    await verify('아이디를 4자로 적으면 아이디 오류 문구가 보이지 않는다', await 가입.아이디오류.isVisible(), false);
  });

  await test.step('회원가입 아이디에 12자를 적는다', async () => {
    await 가입.아이디.fill(params.idMax);
    await verify('아이디를 12자로 적으면 아이디 오류 문구가 보이지 않는다', await 가입.아이디오류.isVisible(), false);
  });
});
