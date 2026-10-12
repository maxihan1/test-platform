import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 주문있는임시회원, 임시회원정리 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-266',
  name: '주문 내역은 주문일이 최근인 주문부터 보인다',
  precondition: ['주문이 둘 이상인 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호들: string[] = [];
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 주문있는임시회원(page.request, 2);
      정보 = 만든.정보;
      주문번호들 = 만든.주문번호들;
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      await 내주문.열기();
      const 날짜들 = (await 내주문.줄글들()).map((칸들) => 칸들[0] ?? '');
      await verify('주문 내역은 주문일이 최근인 주문부터 보인다', 날짜들.length > 1 && 날짜들.every((날짜, 번호) => 번호 === 0 || (날짜들[번호 - 1] ?? '') >= 날짜), true);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, 주문번호들);
  }
});
