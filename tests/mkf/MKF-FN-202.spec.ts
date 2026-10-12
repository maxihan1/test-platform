import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 주문상태 } from './helpers/my-tools.helper.js';
import { 주문있는임시회원, 임시회원정리 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-202',
  name: '결제완료 주문 상세에는 「주문 취소」 버튼이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호들: string[] = [];
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('결제완료 주문이 있는 회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 주문있는임시회원(page.request);
      정보 = 만든.정보;
      주문번호들 = 만든.주문번호들;
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
      await verify('결제완료 주문이 있다', await 주문상태(page.request, 주문번호들[0] ?? ''), '결제완료', { blocker: true });
    });

    await test.step('결제완료 주문의 상세를 연다', async () => {
      await 상세.열기(주문번호들[0] ?? '');
      await 상세.상태배지.waitFor();
      await verify('결제완료 주문 상세에는 「주문 취소」 버튼이 보인다', await 상세.주문취소.isVisible(), true);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, 주문번호들);
  }
});
