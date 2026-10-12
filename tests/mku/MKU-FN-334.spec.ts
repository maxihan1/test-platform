import { defineCase, test, verify } from '@platform/kit';

import { 탈퇴 } from './helpers/account.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-334',
  name: '결제완료 주문을 취소하면 주문 상태가 주문취소로 바뀐다',
  precondition: ['새로 가입한 회원이 결제완료 주문을 하나 했다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 주문번호 = '';

  try {
    await test.step('임시 회원으로 가입해 결제완료 주문을 만든다', async () => {
      const 만든 = await 임시회원과주문(request);
      주문번호 = 만든.주문번호;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('결제완료 주문이 하나 있다', ((await (await request.get('/api/orders/' + encodeURIComponent(주문번호))).json()) as { status: string }).status, '결제완료', { blocker: true });
    });

    await test.step('POST /api/orders/{id}/cancel 을 보낸다', async () => {
      await request.post('/api/orders/' + encodeURIComponent(주문번호) + '/cancel', { data: { reason: '단순 변심', detail: '' } });
      const 상세 = (await (await request.get('/api/orders/' + encodeURIComponent(주문번호))).json()) as { status: string };
      await verify('결제완료 주문을 취소하면 주문 상태가 주문취소로 바뀐다', 상세.status === '주문취소', true);
    });
  } finally {
    if (주문번호 !== '') await 주문취소(request, 주문번호);
    await 탈퇴(request);
  }
});
