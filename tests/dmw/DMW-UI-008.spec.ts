import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니, 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-008',
  name: '장바구니에 상품이 있는 회원 머리글의 장바구니 아이콘 옆에 빨간 숫자 배지가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('장바구니에 상품 한 줄을 담아 둔다', async () => {
      const 상품 = await 옵션없는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id });
      await verify('장바구니에 상품이 한 줄 있다', (await 장바구니(page.request)).length, 1, { blocker: true });
    });

    await test.step('홈 화면을 연다', async () => {
      await 홈.열기();
      await verify('회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
      await 홈.머리.장바구니배지.waitFor();
      await verify('장바구니에 상품이 있는 회원 머리글의 장바구니 아이콘 옆에 빨간 숫자 배지가 보인다', await 홈.머리.장바구니배지.isVisible(), true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
