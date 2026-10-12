import { defineCase, test, verify } from '@platform/kit';

import { 하나만맞는최대가격 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-139',
  name: '조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다',
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

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 0원으로 맞춘 뒤 목록을 확인한다', async () => {
    await 목록.슬라이더맞추기(0);
    await 목록.총개수.filter({ hasText: '총 0개' }).waitFor();
    await verify('조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.없음문구.isVisible(), true);
  });

  await test.step('맞는 상품이 하나뿐인 최대 가격으로 슬라이더를 맞춘다', async () => {
    const 하나뿐인가격 = await 하나만맞는최대가격(page.request);
    await 목록.슬라이더맞추기(하나뿐인가격);
    await 목록.총개수.filter({ hasText: '총 1개' }).waitFor();
    await verify('조건에 맞는 상품이 하나면 안내 없이 카드 1장이 보인다', [await 목록.카드들.count(), await 목록.없음문구.isVisible()], [1, false]);
  });
});
