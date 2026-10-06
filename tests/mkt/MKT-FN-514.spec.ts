import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원지우기, type 임시회원, 아이디사용중인가 } from './components/account.component.js';
import { 응답엿보기, 있어야한다 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';
import { 회원정보수정화면 } from './pages/common-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-514',
  name: '로그인 응답 본문에 비밀번호 원문이 없다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 수정 = new 회원정보수정화면(page);
  const 로그인응답 = new 응답엿보기(page, '**/api/auth/login');
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시킨다', async () => {
      회원 = await 임시회원가입(page.request);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원 계정이 있다', await 아이디사용중인가(page.request, 있어야한다(회원, '새로 만든 회원').loginId), true, { blocker: true });
    });

    await test.step('로그인 화면에서 그 회원으로 로그인하고 로그인 응답을 받는다', async () => {
      const 나 = 있어야한다(회원, '새로 만든 회원');
      await 안내창끄기(page);
      await 로그인응답.걸기();
      await 로그인.열기();
      await 로그인.로그인하기(나.loginId, 나.password);
      await 로그인응답.끝나길기다리기();
      await verify('로그인 응답 본문에 비밀번호 원문이 없다', 로그인응답.본문.includes(나.password), false);
    });

    await test.step('현재 회원 조회 /api/auth/me 응답을 받는다', async () => {
      const 나 = 있어야한다(회원, '새로 만든 회원');
      await 로그인.머리글.로그인됐나기다리기();
      const 응답 = await page.request.get('/api/auth/me');
      await verify('현재 회원 조회 응답에도 비밀번호 원문이 없다', (await 응답.text()).includes(나.password), false);
    });

    await test.step('비밀번호 재확인을 마친 회원정보 수정 화면을 연다', async () => {
      const 나 = 있어야한다(회원, '새로 만든 회원');
      await 수정.열기();
      await 수정.재확인하기(나.password);
      await verify('회원정보 수정 화면 어디에도 비밀번호 원문이 보이지 않는다', (await 수정.화면의글들()).includes(나.password), false);
    });
  } finally {
    await 로그인응답.걷기();
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
