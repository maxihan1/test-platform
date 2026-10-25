import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-091',
  name: '비밀번호를 연속 4번 틀리면 잠금 안내가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    wrongPass: z.string().describe('틀린 비밀번호 — 일회용 회원의 비밀번호와 다른 값').default('Wrong1!pass'),
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

  await test.step('일회용 회원으로 비밀번호를 연속 4번 틀린다', async () => {
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await 로그인.실패하는시도(회원.loginId, params.wrongPass);
    }
    await verify('비밀번호를 연속 4번 틀리면 잠금 안내가 보이지 않는다', await 로그인.잠금안내.isVisible(), false);
  });

  await test.step('일회용 회원으로 비밀번호를 연속 5번 틀린다', async () => {
    await 로그인.실패하는시도(회원.loginId, params.wrongPass);
    await verify('비밀번호를 연속 5번 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', await 로그인.잠금안내.isVisible(), true);
  });
});
