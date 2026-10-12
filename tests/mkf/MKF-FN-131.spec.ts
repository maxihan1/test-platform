import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-131',
  name: '더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다',
  techniques: ['경계값 분석'],
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
    await 목록.카드들.nth(11).waitFor();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('더 불러올 상품이 남아 있으면 「마지막 상품입니다」가 보이지 않는다', await 목록.마지막문구.isVisible(), false);
  });

  await test.step('상품 목록을 마지막 상품까지 내린다', async () => {
    await 목록.모두내리기();
    await verify('더 불러올 상품이 없으면 「마지막 상품입니다」가 보인다', await 목록.마지막문구.isVisible(), true);
  });
});
