import { defineCase, test, verify } from '@platform/kit';

import { 탈퇴 } from './helpers/account.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-273',
  name: '「결제완료」 주문 상세에 「주문 취소」 버튼이 보인다',
  precondition: ['새로 가입한 회원에게 「결제완료」 주문이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 주문번호 = '';
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('임시 회원으로 가입해 결제완료 주문을 만든다', async () => {
      await 방해막기(page);
      const 만든 = await 임시회원과주문(page.request, {});
      주문번호 = 만든.주문번호;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('결제완료 주문이 하나 있다', ((await (await page.request.get('/api/orders/' + encodeURIComponent(주문번호))).json()) as { status: string }).status, '결제완료', { blocker: true });
    });

    await test.step('그 주문 상세를 연다', async () => {
      await 상세.열기(주문번호);
      await 상세.상태배지.waitFor();
      await verify('「결제완료」 주문 상세에 「주문 취소」 버튼이 보인다', await 상세.주문취소.isVisible(), true);
    });
  } finally {
    if (주문번호 !== '') await 주문취소(page.request, 주문번호);
    await 탈퇴(page.request);
  }
});
