import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 상품상세조회 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-214',
  name: '상품 상세 아래에 「상품 설명」 · 「리뷰 ({개수})」 · 「상품 문의」 탭이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 /shop/1 을 연다', async () => {
    const 상품 = await 상품상세조회(page.request, 1);
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify('상품 상세 아래에 「상품 설명」 · 「리뷰 ({개수})」 · 「상품 문의」 탭이 보인다', [await 상세.설명탭.isVisible(), await 상세.리뷰탭글(상품.reviewCount).isVisible(), await 상세.문의탭.isVisible()], [true, true, true]);
  });
});
