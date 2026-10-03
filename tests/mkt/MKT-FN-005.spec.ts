import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-005',
  name: '비회원이 로그인이 필요한 화면을 열면 로그인 화면으로 가고 로그인하면 돌아온다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '장바구니 주소로 가면 로그인 화면이 나온다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);

  await test.step('글쓰기 · 장바구니 · 주문서 · 마이페이지 · 1:1 문의 주소를 차례로 연다', async () => {
    await 홈.쿠키띠를치운다();
    const 도착한곳: string[] = [];
    for (const 경로 of ['/board/write', '/cart', '/checkout', '/my/orders', '/support/inquiry']) {
      await page.goto(경로);
      await 로그인.로그인버튼.waitFor();
      도착한곳.push(new URL(page.url()).pathname);
    }
    await verify(
      '비회원이 글쓰기 · 장바구니 · 주문서 · 마이페이지 · 1:1 문의 화면을 열면 로그인 화면으로 간다',
      도착한곳.join(', '),
      '/login, /login, /login, /login, /login',
    );
  });

  await test.step('장바구니 주소로 가면 로그인 화면이 나오는지 확인한다', async () => {
    await page.goto('/cart');
    await 로그인.로그인버튼.waitFor();
    await verify('장바구니 주소로 가면 로그인 화면이 나온다', new URL(page.url()).pathname, '/login', { blocker: true });
  });

  await test.step('로그인 화면에서 로그인한다', async () => {
    await 홈.공지팝업을치운다();
    await 로그인.입력한다(params.loginId, params.password ?? '');
    await 로그인.누른다();
    await 머리.로그아웃.waitFor();
    await verify('로그인하면 원래 가려던 화면으로 돌아온다', new URL(page.url()).pathname, '/cart');
  });
});
