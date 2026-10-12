import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 주문첫상품이름 } from './helpers/my-tools.helper.js';
import { 상품둘을한번에주문한임시회원, 임시회원정리 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-242',
  name: '주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다',
  precondition: ['회원으로 로그인해 있다', '상품 두 개를 한 번에 주문한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호들: string[] = [];
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('상품 두 개를 한 번에 주문한 회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 상품둘을한번에주문한임시회원(page.request);
      정보 = 만든.정보;
      주문번호들 = 만든.주문번호들;
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('마이페이지 주문 내역을 연다', async () => {
      await 내주문.열기();
      const 줄들 = await 내주문.줄글들();
      await verify('주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다', 줄들.length > 0 && 줄들.every((칸들) => 칸들.length === 5 && 칸들.every((칸) => 칸 !== '')), true);
      const 내줄 = 줄들.find((칸들) => 칸들[1] === 주문번호들[0]);
      await verify('상품 두 개를 주문한 줄의 상품명은 「<대표 상품명> 외 1건」으로 보인다', 내줄?.[2], `${await 주문첫상품이름(page.request, 주문번호들[0] ?? '')} 외 1건`);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, 주문번호들);
  }
});
