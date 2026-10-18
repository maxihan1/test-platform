import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 품절상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-164',
  name: '품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('품절 상품 카드를 확인한다', async () => {
    await 방해창막기(page);
    const 상품 = await 품절상품(page.request);
    await 목록.열기();
    await 목록.다불러올때까지내리기();
    const 카드 = 목록.카드(상품.id);
    await verify('상품 목록에 품절 상품 카드가 보인다', await 카드.isVisible(), true, { blocker: true });
    const 덮개 = await 목록.품절덮개상태(카드);
    await verify('품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다', `${덮개.회색 ? '회색 덮개' : '덮개 없음'}, ${덮개.글 === '품절' ? '품절 표시' : '표시 없음'}`, '회색 덮개, 품절 표시');
  });
});
