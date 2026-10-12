import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 주문있는임시회원, 임시회원정리 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-200',
  name: '주문번호를 누르면 주문 상세 /my/orders/{id} 화면으로 간다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호들: string[] = [];
  const 상세 = new 내주문상세화면(page);
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 주문있는임시회원(page.request);
      정보 = 만든.정보;
      주문번호들 = 만든.주문번호들;
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('주문 내역의 첫 주문번호를 누른다', async () => {
      await 내주문.열기();
      const 번호 = (await 내주문.주문번호링크들.first().innerText()).trim();
      await 내주문.주문번호링크들.first().click();
      await 상세.그려질때까지();
      await verify('주문번호를 누르면 주문 상세 /my/orders/{id} 화면으로 간다', [new URL(page.url()).pathname, await 상세.주문번호표시(번호).isVisible()], [`/my/orders/${번호}`, true]);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, 주문번호들);
  }
});
