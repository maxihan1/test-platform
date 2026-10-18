import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-208',
  name: '더 불러올 상품이 1개 이상 남아 있으면 「마지막 상품입니다」가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('상품을 더 불러올 것이 남은 상태로 목록 끝을 확인한다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록에 더 불러올 상품이 남아 있다', (await 목록.카드들.count()) < (await 목록.총개수읽기()), true, { blocker: true });
    await verify('더 불러올 상품이 1개 이상 남아 있으면 「마지막 상품입니다」가 보이지 않는다', await 목록.마지막문구.isVisible(), false);
  });

  await test.step('상품을 다 불러올 때까지 목록 끝까지 내린다', async () => {
    await 목록.다불러올때까지내리기();
    await verify('더 불러올 상품이 0개가 되면 「마지막 상품입니다」가 보인다', await 목록.마지막문구.isVisible(), true);
  });
});
