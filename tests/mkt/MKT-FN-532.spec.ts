import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니응답서버오류로 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-532',
  name: '장바구니 응답이 서버 오류면 장바구니 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['장바구니 응답은 가짜 500 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 알림 = new 토스트(page);
  const 상태: { 회원?: 회원정보 } = {};
  const 거두기 = await 장바구니응답서버오류로(page);

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기만();
      await verify('장바구니 화면 제목 「장바구니」가 보인다', await 장바구니.제목.isVisible(), true, { blocker: true });
      await 알림.아무거나뜰때까지();
      await verify('장바구니 응답이 서버 오류면 장바구니 화면이 깨지지 않고 오류 안내가 보인다', [await 장바구니.제목.isVisible(), await 알림.모두.last().isVisible()], [true, true]);
    });
  } finally {
    await 거두기();
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
