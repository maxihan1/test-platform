import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 상품하나주문하기, 주문상태 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-415',
  name: '결제완료 주문 취소 요청은 성공하고 상태가 주문취소가 된다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원에게 「결제완료」 주문이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 주문번호?: string } = {};

  try {
    await test.step('새로 가입한 회원에게 결제완료 주문을 하나 만든다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.주문번호 = (await 상품하나주문하기(request, 2)).id;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('주문 상태가 「결제완료」다', await 주문상태(request, 준비.주문번호 ?? ''), '결제완료', { blocker: true });
    });

    await test.step('POST /api/orders/{id}/cancel 로 취소한다', async () => {
      const 응답 = await request.post(`/api/orders/${encodeURIComponent(준비.주문번호 ?? '')}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify(
        '결제완료 주문 취소 요청은 성공하고 상태가 주문취소가 된다',
        { 성공: 응답.ok(), 상태: await 주문상태(request, 준비.주문번호 ?? '') },
        { 성공: true, 상태: '주문취소' },
      );
    });
  } finally {
    await 회원과주문정리(request, 준비.회원, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
  }
});
