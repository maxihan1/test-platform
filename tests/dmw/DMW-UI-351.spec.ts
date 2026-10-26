import { defineCase, test, verify } from '@platform/kit';

import { 첫화면상품들 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-351',
  name: '상품 목록에서 상품 카드를 누르면 그 상품 상세가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);
  const 상품 = (await 첫화면상품들(request))[0];
  await 안내창막기(page);

  await test.step('상품 목록의 상품 카드를 누른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카드누르기(상품.name);
    await 상세.다그려질때까지();
    await verify('상품 목록에서 상품 카드를 누르면 그 상품 상세가 보인다', await 상세.제목.innerText(), 상품.name);
  });

  await test.step('상품 정렬 선택 상자에서 「높은 가격순」을 고른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.정렬고르기('높은 가격순');
    await verify('상품 목록에서 정렬 「높은 가격순」을 고르면 정렬 선택 상자가 「높은 가격순」으로 바뀐다', await 목록.정렬고른글(), '높은 가격순');
  });
});
