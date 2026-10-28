import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들 } from './helpers/app.helper.js';
import { 맨위줄제목보다오른쪽인가 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-027',
  name: '상품 목록 맨 위 줄 오른쪽에 「장바구니 {N}」 · 「주문 내역」 · 「로그아웃」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록 맨 위 줄 오른쪽을 확인한다', async () => {
    const 장바구니글 = await verify('「장바구니 {N}」이 보인다', /^장바구니 \d+$/.test(await 목록.장바구니버튼글()), true);
    const 장바구니자리 = await verify(
      '「장바구니 {N}」이 맨 위 줄 제목보다 오른쪽에 있다',
      await 맨위줄제목보다오른쪽인가(driver, await 목록.장바구니버튼.getElement()),
      true,
    );
    const 주문내역글 = await verify('「주문 내역」이 보인다', (await 글들(await 목록.주문내역버튼.getElement())).join(', '), '주문 내역');
    const 주문내역자리 = await verify(
      '「주문 내역」이 맨 위 줄 제목보다 오른쪽에 있다',
      await 맨위줄제목보다오른쪽인가(driver, await 목록.주문내역버튼.getElement()),
      true,
    );
    const 로그아웃글 = await verify('「로그아웃」이 보인다', (await 글들(await 목록.로그아웃버튼.getElement())).join(', '), '로그아웃');
    const 로그아웃자리 = await verify(
      '「로그아웃」이 맨 위 줄 제목보다 오른쪽에 있다',
      await 맨위줄제목보다오른쪽인가(driver, await 목록.로그아웃버튼.getElement()),
      true,
    );
    await verify(
      '상품 목록 맨 위 줄 오른쪽에 「장바구니 {N}」 · 「주문 내역」 · 「로그아웃」이 보인다',
      장바구니글 && 장바구니자리 && 주문내역글 && 주문내역자리 && 로그아웃글 && 로그아웃자리,
      true,
    );
  });
});
