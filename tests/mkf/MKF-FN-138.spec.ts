import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-138',
  name: '카테고리를 바꾸면 「총 {N}개」가 그 카테고리 상품 수로 바뀐다',
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

  await test.step('목록을 24장까지 내린 뒤 정렬을 「높은 가격순」으로 바꾼다', async () => {
    await 목록.끝까지내리기();
    await 목록.카드들.nth(23).waitFor();
    await 목록.맨위로올리기();
    await 목록.정렬.selectOption({ label: '높은 가격순' });
    await 목록.카드들.nth(12).waitFor({ state: 'detached' });
    await 목록.카드들.first().waitFor();
    await verify('정렬을 바꾸면 목록이 처음 12장부터 다시 보인다', await 목록.카드들.count(), 12);
  });

  await test.step('카테고리 「패션」을 고른다', async () => {
    const 패션수 = (await 상품목록(page.request)).items.filter((상품줄) => 상품줄.category === '패션').length;
    await 목록.카테고리('패션').check();
    await 목록.총개수.filter({ hasText: '총 ' + String(패션수) + '개' }).waitFor();
    await verify('카테고리를 바꾸면 「총 {N}개」가 그 카테고리 상품 수로 바뀐다', await 목록.총개수.innerText(), '총 ' + String(패션수) + '개');
  });
});
