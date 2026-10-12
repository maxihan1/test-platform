import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-157',
  name: '카테고리 「패션」과 「도서」를 고르면 두 카테고리 상품만 보인다',
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

  await test.step('카테고리 「패션」과 「도서」를 고른다', async () => {
    const 기대 = (await 상품목록(page.request)).items.filter((상품) => ['패션', '도서'].includes(상품.category));
    await 목록.카테고리('패션').check();
    await 목록.카테고리('도서').check();
    await 목록.총개수.filter({ hasText: `총 ${String(기대.length)}개` }).waitFor();
    const 이름들 = await 목록.카드이름들();
    const 허용 = new Set(기대.map((상품) => 상품.name));
    await verify('카테고리 「패션」과 「도서」를 고르면 두 카테고리 상품만 보인다', 이름들.length > 0 && 이름들.every((이름) => 허용.has(이름)), true);
  });
});
