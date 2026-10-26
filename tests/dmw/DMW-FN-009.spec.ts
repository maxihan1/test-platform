import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니, 장바구니담기, 장바구니비우기, 옵션없는상품 } from './helpers/data.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-009',
  name: '장바구니가 비어 있으면 머리글 장바구니 배지가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('장바구니를 비운 채 홈 화면을 연다', async () => {
      await verify('장바구니가 비어 있다', (await 장바구니(page.request)).length, 0, { blocker: true });
      await 홈.열고장바구니응답까지();
      await verify('일회용 회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있으면 머리글 장바구니 배지가 보이지 않는다', await 홈.머리.장바구니배지.isVisible(), false);
    });

    await test.step('상품 한 줄을 장바구니에 담는다', async () => {
      const 상품 = await 옵션없는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id });
      await 홈.열기();
      await 홈.머리.장바구니배지.waitFor();
      await verify('장바구니에 한 줄을 담으면 머리글 장바구니 배지가 「1」로 보인다', await 홈.머리.장바구니배지.innerText(), '1');
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
