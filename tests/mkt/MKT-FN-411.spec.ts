import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 주문요청, 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-411',
  name: '주문 요청은 성공으로 응답하고 주문번호를 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 줄번호?: number; 주문번호?: string } = {};

  try {
    await test.step('새로 가입한 회원의 장바구니에 상품을 하나 담는다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.줄번호 = await 장바구니담기(request, 2, 1);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
      await verify('장바구니에 상품이 하나 있다', (await 장바구니목록(request)).length, 1, { blocker: true });
    });

    await test.step('POST /api/orders 로 주문한다', async () => {
      const 응답 = await 주문요청(request, { cartItemIds: [준비.줄번호 ?? 0] });
      const 본문 = (await 응답.json()) as { id?: string };
      if (응답.ok() && 본문.id) 준비.주문번호 = 본문.id;
      await verify(
        '주문 요청은 성공으로 응답하고 주문번호를 준다',
        { 성공: 응답.ok(), 주문번호꼴: /^DM\d{8}-\d{4}$/.test(본문.id ?? '') },
        { 성공: true, 주문번호꼴: true },
      );
    });
  } finally {
    await 회원과주문정리(request, 준비.회원, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
  }
});
