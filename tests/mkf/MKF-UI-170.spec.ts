import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-170',
  name: '상품 정렬 드롭다운은 처음에 「추천순」이고 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    await verify('상품 정렬 드롭다운은 처음에 「추천순」이고 「낮은 가격순」 · 「높은 가격순」 · 「리뷰 많은순」이 있다', [await 목록.선택된정렬글(), await 목록.정렬옵션.allInnerTexts()], ['추천순', ['추천순', '낮은 가격순', '높은 가격순', '리뷰 많은순']]);
  });
});
