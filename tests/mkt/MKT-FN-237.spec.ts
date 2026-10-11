import { defineCase, test, verify } from '@platform/kit';

import { 탈퇴 } from './helpers/account.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품정보, 주문취소 } from './helpers/shop.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-237',
  name: '「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다',
  precondition: ['새로 가입한 회원에게 「결제완료」 주문이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  let 주문번호 = '';
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('임시 회원으로 가입해 결제완료 주문을 만든다', async () => {
      await 방해막기(page);
      const 만든 = await 임시회원과주문(page.request, {});
      담음 = 만든.담음;
      주문번호 = 만든.주문번호;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('결제완료 주문이 하나 있다', ((await (await page.request.get('/api/orders/' + encodeURIComponent(주문번호))).json()) as { status: string }).status, '결제완료', { blocker: true });
    });

    await test.step('취소 사유 「단순 변심」을 고르고 「취소 신청」을 누른다', async () => {
      await 상세.열기(주문번호);
      await 상세.상태배지.waitFor();
      await 상세.주문취소.click();
      await 상세.모달.창.waitFor();
      await 상세.취소사유.selectOption({ label: '단순 변심' });
      await 상세.취소신청.click();
      await 상세.주문취소.waitFor({ state: 'detached' });
      await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태배지.innerText(), '주문취소');
      await verify('주문을 취소하면 그 상품 재고가 주문 전 수로 돌아온다', (await 상품정보(page.request, 담음.상품.id)).stock === 담음.재고전, true);
    });
  } finally {
    if (주문번호 !== '') await 주문취소(page.request, 주문번호);
    await 탈퇴(page.request);
  }
});
