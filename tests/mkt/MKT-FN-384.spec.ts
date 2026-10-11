import { defineCase, test, verify } from '@platform/kit';

import { 탈퇴 } from './helpers/account.helper.js';
import { 임시회원과주문 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 주문취소 } from './helpers/shop.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-384',
  name: '취소 사유 칸에 200자를 넣으면 200자가 다 들어간다',
  techniques: ['경계값 분석'],
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

    await test.step('「기타」를 고르고 사유 칸에 200자를 넣는다', async () => {
      await 상세.열기(주문번호);
      await 상세.상태배지.waitFor();
      await 상세.주문취소.click();
      await 상세.모달.창.waitFor();
      await 상세.취소사유.selectOption({ label: '기타' });
      await 상세.사유입력.fill('가'.repeat(200));
      await verify('취소 사유 칸에 200자를 넣으면 200자가 다 들어간다', (await 상세.사유입력.inputValue()).length, 200);
    });

    await test.step('「기타」를 고르고 사유 칸에 201자를 넣는다', async () => {
      await 상세.사유입력.fill('가'.repeat(201));
      await verify('취소 사유 칸에 201자를 넣으면 200자까지만 들어간다', (await 상세.사유입력.inputValue()).length, 200);
    });
  } finally {
    if (주문번호 !== '') await 주문취소(page.request, 주문번호);
    await 탈퇴(page.request);
  }
});
