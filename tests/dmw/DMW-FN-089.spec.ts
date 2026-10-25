import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새비밀번호, 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-089',
  name: '비밀번호를 틀리게 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    wrongPass: z.string().describe('틀린 비밀번호 — 일회용 회원의 비밀번호와 다른 값').default('Wrong1!pass'),
    noSuchId: z.string().describe('없는 아이디 — 가입된 적 없는 영문 소문자·숫자 4~12자').default('nosuchuser99'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 로그인 = new 로그인화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원 아이디와 틀린 비밀번호로 로그인한다', async () => {
    await 로그인.실패하는시도(회원.loginId, params.wrongPass);
    await verify('비밀번호를 틀리게 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 로그인.일반오류.isVisible(), true);
  });

  await test.step('없는 아이디로 로그인한다', async () => {
    await 로그인.실패하는시도(params.noSuchId, 새비밀번호());
    await verify('없는 아이디로 로그인해도 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 로그인.일반오류.isVisible(), true);
  });
});
