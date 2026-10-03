import { defineCase, test, verify } from '@platform/kit';
import type { Route } from '@playwright/test';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-007',
  name: '로그인 응답을 기다리는 동안 버튼이 눌리지 않고 로딩 표시가 보인다',
  platforms: ['desktop'],
  precondition: ['로그인 응답은 늦춘 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  let 풀기 = (): void => {};
  const 문 = new Promise<void>((끝) => {
    풀기 = () => 끝();
  });
  const 늦추기 = async (경로: Route): Promise<void> => {
    await 문;
    await 경로.continue();
  };

  await page.context().route('**/api/auth/login', 늦추기);
  try {
    await test.step('로그인 화면에서 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 홈.쿠키띠를치운다();
      await 로그인.열기();
      await 로그인.입력한다(params.loginId, params.password ?? '');
      await 로그인.누른다();
      await 홈.처리중표시.waitFor();
      await verify('서버 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 홈.처리중버튼.isDisabled(), true);
      await verify('서버 응답을 기다리는 동안 버튼 글자 대신 로딩 표시가 보인다', await 홈.처리중표시.isVisible(), true);
      풀기();
      await 머리.로그아웃.waitFor();
    });
  } finally {
    풀기();
    await page.context().unroute('**/api/auth/login', 늦추기);
  }
});
