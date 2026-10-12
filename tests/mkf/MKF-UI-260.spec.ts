import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-260',
  name: '고객센터 FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 세션사용자(page.request), null, { blocker: true });
  });

  await test.step('고객센터를 연다', async () => {
    await 센터.열기();
    await 센터.질문들.first().waitFor();
    await verify('고객센터 FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다', [await 센터.탭글들(), (await 센터.질문들.count()) > 0], [['회원', '주문/결제', '배송', '반품/교환'], true]);
  });
});
