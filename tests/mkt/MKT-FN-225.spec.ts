import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 응답붙잡기 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-225',
  name: '상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['상품 목록 응답을 늦춰 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 붙잡음 = await 응답붙잡기(page, (주소) => 주소.pathname === '/api/products');

  try {
    await test.step('상품 목록 화면을 연다', async () => {
      await 방해창막기(page);
      await 목록.열기만();
      await 붙잡음.도착했을때까지;
      await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('상품 목록을 불러오는 동안 회색 빈 카드 12개가 보인다', await 목록.빈카드.count(), 12);
    });

    await test.step('상품 목록 응답이 오기를 기다린다', async () => {
      붙잡음.풀기();
      await 목록.카드나올때까지();
      await verify('상품 목록 응답이 오면 빈 카드가 실제 상품 카드로 바뀐다', `빈 카드 ${await 목록.빈카드.count()}개, 상품 카드 ${await 목록.카드들.count()}개`, '빈 카드 0개, 상품 카드 12개');
    });
  } finally {
    await 붙잡음.거두기();
  }
});
