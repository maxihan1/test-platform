import { defineCase, test, verify } from '@platform/kit';

import { 내정보, type 회원정보 } from './helpers/account.helper.js';
import { 주문상태 } from './helpers/my-tools.helper.js';
import { 임시회원정리 } from './helpers/member-order.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품정보 } from './helpers/shop.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-207',
  name: '「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다',
  precondition: ['결제완료 주문이 있는 새 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  let 주문번호 = '';
  let 담음: 담은상품 | undefined;
  let 취소전재고 = -1;
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('결제완료 주문이 있는 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      const 만든 = await 임시회원과주문(page.request);
      정보 = 만든.정보;
      주문번호 = 만든.주문번호;
      담음 = 만든.담음;
    });

    await test.step('결제완료 주문이 있는 새 회원으로 로그인했는지 확인한다', async () => {
      await verify('새 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
      await verify('결제완료 주문이 있다', await 주문상태(page.request, 주문번호), '결제완료', { blocker: true });
    });

    await test.step('그 주문 상세에서 「주문 취소」를 누르고 「취소 신청」을 누른다', async () => {
      await 상세.열기(주문번호);
      await 상세.상태배지.waitFor();
      취소전재고 = 담음 === undefined ? -1 : (await 상품정보(page.request, 담음.상품.id)).stock;
      await 상세.취소창열기();
      await 상세.취소사유.selectOption({ label: '단순 변심' });
      await 상세.취소신청.click();
      await 상세.주문취소.waitFor({ state: 'detached' });
      await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태배지.innerText(), '주문취소');
    });

    await test.step('주문 취소 전후 그 상품 재고를 확인한다', async () => {
      const 취소후재고 = 담음 === undefined ? -1 : (await 상품정보(page.request, 담음.상품.id)).stock;
      await verify('주문을 취소하면 그 상품 재고가 주문 수량만큼 되돌아온다', 취소후재고 - 취소전재고, 담음?.수량);
    });
  } finally {
    if (정보 !== undefined) await 임시회원정리(page.request, [주문번호]);
  }
});
