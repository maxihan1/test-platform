import { defineCase, test, verify } from '@platform/kit';

import { 응답늦추기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-203',
  name: '상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);
  const 늦춤 = await 응답늦추기(page, /\/api\/products\?/);

  try {
    await test.step('상품 목록 응답을 늦춘 채 상품 목록을 연다', async () => {
      await 목록.이동();
      await 목록.제목.waitFor();
      await 목록.빈카드들.first().waitFor();
      await verify('상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다', await 목록.빈카드들.count(), 12);
    });

    await test.step('늦춘 응답이 온 뒤 목록을 확인한다', async () => {
      늦춤.풀기();
      await 목록.카드들.first().waitFor();
      const 빈카드 = await verify('빈 카드가 남아 있지 않다', await 목록.빈카드들.count(), 0);
      const 실제카드 = await verify('실제 상품 카드 12개가 보인다', await 목록.카드수(), 12);
      await verify('상품 목록을 다 불러오면 빈 카드가 실제 상품 카드로 바뀐다', 빈카드 && 실제카드, true);
    });
  } finally {
    await 늦춤.끝내기();
  }
});
