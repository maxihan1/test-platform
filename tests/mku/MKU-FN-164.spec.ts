import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-164',
  name: '카테고리 「도서」를 고르면 위쪽 「총 {N}개」가 도서 상품 수로 바뀐다',
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

  await test.step('카테고리 「도서」를 고른다', async () => {
    const 도서수 = (await 상품목록(page.request)).items.filter((상품) => 상품.category === '도서').length;
    await 목록.카테고리('도서').check();
    await 목록.빈카드들.first().waitFor({ state: 'detached' });
    await verify('카테고리 「도서」를 고르면 위쪽 「총 {N}개」가 도서 상품 수로 바뀐다', await 목록.총개수.innerText(), `총 ${String(도서수)}개`);
  });
});
