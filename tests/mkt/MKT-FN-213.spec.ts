import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-213',
  name: '「품절 상품 제외」를 켜면 품절 상품 카드가 목록에서 빠진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('상품 목록을 끝까지 내려 품절 상품 카드를 불러온다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await 목록.다불러올때까지내리기();
  });

  await test.step('목록에 품절 상품 카드가 있는지 확인한다', async () => {
    await verify('상품 목록에 품절 상품 카드가 있다', (await 목록.품절카드들.count()) > 0, true, { blocker: true });
  });

  await test.step('「품절 상품 제외」를 켠다', async () => {
    await 목록.품절제외.check();
    await 목록.목록다시나올때까지();
    await 목록.다불러올때까지내리기();
    await verify('「품절 상품 제외」를 켜면 품절 상품 카드가 목록에서 빠진다', await 목록.품절카드들.count(), 0);
  });
});
