import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-009',
  name: '장바구니가 0개면 장바구니 배지가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니가 비어 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 만든다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await verify('장바구니가 비어 있다', (await 장바구니목록(page.request)).length, 0, { blocker: true });
    });

    await test.step('장바구니가 빈 회원으로 홈 화면을 연다', async () => {
      await 홈.회원으로열기();
      await 홈.머리글.로그인꼴일때까지();
      await verify('장바구니가 0개면 장바구니 배지가 보이지 않는다', await 홈.머리글.장바구니배지.isVisible(), false);
    });

    await test.step('상품 하나를 장바구니에 담고 홈 화면을 다시 연다', async () => {
      await 장바구니담기(page.request, 2);
      await 홈.회원으로열기();
      await 홈.머리글.장바구니배지.waitFor();
      await verify('장바구니가 1개가 되면 배지에 「1」이 보인다', await 홈.머리글.장바구니배지.innerText(), '1');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
