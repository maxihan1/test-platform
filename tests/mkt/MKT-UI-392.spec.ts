import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-392',
  name: '상품 목록 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이라 세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('상품 목록에서 「도서」를 누른다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await 목록.카테고리('도서').click();
    await verify('상품 목록에서 「도서」를 누르면 카테고리 「도서」가 켜진다', await 목록.카테고리('도서').isChecked(), true);
    await 목록.목록다시나올때까지();
    await 목록.카테고리('도서').click();
    await 목록.목록다시나올때까지();
  });

  await test.step('상품 목록에서 「품절 상품 제외」를 누른다', async () => {
    await 목록.품절제외.click();
    await verify('상품 목록에서 「품절 상품 제외」를 누르면 스위치가 켜진다', await 목록.품절제외.isChecked(), true);
    await 목록.목록다시나올때까지();
    await 목록.품절제외.click();
    await 목록.목록다시나올때까지();
  });

  await test.step('상품 목록에서 「첫 상품 카드」를 누른다', async () => {
    const 카드 = 목록.카드들.first();
    const 주소 = await 카드.getAttribute('href');
    await 카드.click();
    await 상세.큰이미지버튼.waitFor();
    await verify('상품 목록에서 「첫 상품 카드」를 누르면 그 상품 상세가 보인다', new URL(page.url()).pathname, 주소);
  });
});
