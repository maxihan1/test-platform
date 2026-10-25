import { defineCase, test, verify } from '@platform/kit';

import { 전체상품이름들 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-188',
  name: '카테고리 「패션」과 「도서」를 고르면 두 분류 상품만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 두분류 = (await 전체상품이름들(request, (하나) => 하나.category === '패션' || 하나.category === '도서')).sort();
  const 전부 = (await 전체상품이름들(request)).sort();
  await 안내창막기(page);

  await test.step('카테고리 「패션」과 「도서」를 고른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카테고리켜기('패션');
    await 목록.카테고리켜기('도서');
    await 목록.카드들.first().waitFor();
    await 목록.끝까지내리기();
    await verify('카테고리 「패션」과 「도서」를 고르면 두 분류 상품만 보인다', (await 목록.카드이름들()).sort().join(', '), 두분류.join(', '));
  });

  await test.step('카테고리를 하나도 고르지 않는다', async () => {
    await 목록.카테고리끄기('패션');
    await 목록.카테고리끄기('도서');
    await 목록.카드들.first().waitFor();
    await 목록.끝까지내리기();
    await verify('카테고리를 고르지 않으면 모든 분류 상품이 보인다', (await 목록.카드이름들()).sort().join(', '), 전부.join(', '));
  });
});
