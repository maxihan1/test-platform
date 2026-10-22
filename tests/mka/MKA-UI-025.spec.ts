import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 서버로그인, 장바구니읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-025',
  name: '상품 목록 맨 위 줄에 「상품」과 「장바구니 {N}」 · 「주문 내역」 · 「로그아웃」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, 아이디, 비밀번호);
    await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 줄수 = (await 장바구니읽기(request)).length;
    const 제목 = await verify('「상품」이 보인다', await new 머리줄(driver).제목글(), '상품');
    const 장바구니 = await verify('「장바구니 {N}」가 보인다', await 목록.장바구니버튼글.getText().catch(() => ''), `장바구니 ${줄수}`);
    const 주문내역 = await verify('「주문 내역」이 보인다', await 목록.주문내역버튼글.getText().catch(() => ''), '주문 내역');
    const 로그아웃 = await verify('「로그아웃」이 보인다', await 목록.로그아웃버튼글.getText().catch(() => ''), '로그아웃');
    await verify('상품 목록 맨 위 줄에 「상품」과 「장바구니 {N}」 · 「주문 내역」 · 「로그아웃」이 보인다', 제목 && 장바구니 && 주문내역 && 로그아웃, true);
  });
});
