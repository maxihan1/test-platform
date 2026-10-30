import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 뒤쪽상품, 상품재고읽기, 상품주문하기, 아직안고른상품 } from './helpers/orders-flow.helper.js';
import { 상품고치기 } from './helpers/ops-data.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-100',
  name: '운영툴에서 주문을 취소하면 그 상품 재고가 1 늘어난다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 결제완료 주문이 있고 그 상품 재고를 적어 두었다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 주문관리화면(page);
  let 상품 = 아직안고른상품;
  let 주문 = '';

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
      await 화면.틀.머리줄.waitFor();
      await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원에게 결제완료 주문을 만들고 그 상품 재고를 적어 둔다', async () => {
      const 회원 = await 회원가입(request);
      상품 = await 뒤쪽상품(page, 8);
      주문 = await 상품주문하기(page, 회원.loginId, 회원.password, 상품.id);
    });

    await test.step('만든 결제완료 주문과 그 상품 재고를 확인한다', async () => {
      await 화면.열기();
      await 화면.주문줄(주문).waitFor();
      await verify('일회용 회원에게 결제완료 주문이 있다', await 화면.상태글자(주문), '결제완료', { blocker: true });
      await verify('그 상품 재고를 적어 두었다', typeof (await 상품재고읽기(page, 상품.name, 상품.id)), 'number', { blocker: true });
    });

    await test.step('「주문취소」를 고르고 확인 창에서 「주문 취소」를 누른다', async () => {
      await 화면.취소고르기(주문);
      await 화면.틀.확인창.waitFor();
      const 전 = await 상품재고읽기(page, 상품.name, 상품.id);
      await 화면.취소확정();
      const 후 = await 상품재고읽기(page, 상품.name, 상품.id);
      await verify('운영툴에서 주문을 취소하면 그 상품 재고가 1 늘어난다', 후 - 전, 1);
    });
  } finally {
    if (상품.id !== 0) await 상품고치기(page, 상품);
  }
});
