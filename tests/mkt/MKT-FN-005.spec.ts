import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인필요화면 } from './pages/common-gate.page.js';
import { 로그인화면보충 } from './pages/common-login.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-005',
  name: '로그인이 필요한 화면을 비회원이 열면 로그인 화면으로 가고 로그인하면 원래 화면으로 돌아온다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 필요화면 = new 로그인필요화면(page);
  const 로그인 = new 로그인화면(page);
  const 보충 = new 로그인화면보충(page);

  await test.step('글쓰기 · 장바구니 · 주문서 · 마이페이지 · 1:1 문의 화면을 차례로 연다', async () => {
    await 필요화면.열기('/board/write');
    await 보충.로그인제목().waitFor();
    await verify('비회원이 글쓰기 화면을 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
    await 필요화면.열기('/cart');
    await 보충.로그인제목().waitFor();
    await verify('비회원이 장바구니 화면을 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
    await 필요화면.열기('/checkout');
    await 보충.로그인제목().waitFor();
    await verify('비회원이 주문서 화면을 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
    await 필요화면.열기('/my/orders');
    await 보충.로그인제목().waitFor();
    await verify('비회원이 마이페이지를 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
    await 필요화면.열기('/support/inquiry');
    await 보충.로그인제목().waitFor();
    await verify('비회원이 1:1 문의 화면을 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
  });

  await test.step('글쓰기 화면을 열어 로그인 화면으로 간 뒤 로그인한다', async () => {
    await 필요화면.열기('/board/write');
    await 보충.로그인제목().waitFor();
    await 로그인.로그인하기(params.loginId, params.password ?? '');
    await 필요화면.글쓰기제목().waitFor();
    await verify('로그인하면 원래 가려던 글쓰기 화면으로 돌아온다', new URL(page.url()).pathname, '/board/write');
  });
});
