import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-163',
  name: '카드 24개를 불러온 뒤 정렬을 바꾸면 카드가 처음 12개로 다시 보인다',
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

  await test.step('상품 카드 24개를 불러온 뒤 정렬을 바꾼다', async () => {
    await 목록.끝까지내리기();
    await 목록.카드들.nth(23).waitFor();
    await 목록.맨위로올리기();
    await 목록.정렬.selectOption({ label: '낮은 가격순' });
    await 목록.빈카드들.first().waitFor({ state: 'detached' });
    await verify('카드 24개를 불러온 뒤 정렬을 바꾸면 카드가 처음 12개로 다시 보인다', await 목록.카드들.count(), 12);
  });
});
