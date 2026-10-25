import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-194',
  name: '정렬을 「낮은 가격순」으로 바꾸면 가격이 낮은 순으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품 정렬을 「낮은 가격순」으로 바꾼다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.정렬고르기('낮은 가격순');
    await 목록.카드들.first().waitFor();
    const 가격들 = await 목록.카드가격들();
    const 낮은순 = [...가격들].sort((a, b) => a - b);
    await verify('정렬을 「낮은 가격순」으로 바꾸면 가격이 낮은 순으로 보인다', 가격들.join(', '), 낮은순.join(', '));
  });
});
