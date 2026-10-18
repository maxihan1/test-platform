import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-008',
  name: '장바구니 아이콘 옆에 빨간 숫자 배지 「2」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 만들고 장바구니에 상품 두 줄을 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, 2);
      await 장바구니담기(page.request, 3);
      await verify('장바구니에 상품 두 줄이 담겨 있다', (await 장바구니목록(page.request)).length, 2, { blocker: true });
    });

    await test.step('장바구니에 두 줄이 담긴 회원으로 홈 화면을 연다', async () => {
      await 홈.열기();
      await 홈.머리글.장바구니배지.waitFor();
      await verify(
        '장바구니 아이콘 옆에 빨간 숫자 배지 「2」가 보인다',
        { 글자: await 홈.머리글.장바구니배지.innerText(), 빨강: await 홈.장바구니배지빨강인가() },
        { 글자: '2', 빨강: true },
      );
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
