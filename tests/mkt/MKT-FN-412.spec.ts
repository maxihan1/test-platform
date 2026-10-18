import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 주문요청, 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-412',
  name: '비로그인 주문 요청은 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    상품번호: z.number().int().min(1).describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
    넘치는수량: z.number().int().min(1).describe('주문 수량 — 재고보다 많은 수').default(99999),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
    });

    await test.step('로그인 없이 주문 요청을 보낸다', async () => {
      const 응답 = await 주문요청(request, { direct: { productId: params.상품번호, qty: 1, color: '', size: '' } });
      await verify('비로그인 주문 요청은 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('재고보다 많은 수량으로 주문 요청을 보낸다', async () => {
      const 응답 = await 주문요청(request, { direct: { productId: params.상품번호, qty: params.넘치는수량, color: '', size: '' } });
      await verify('재고가 부족한 주문 요청은 409 로 응답한다', 응답.status(), 409);
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});
