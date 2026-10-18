import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문완료화면 } from './pages/order-done.page.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-397',
  name: '주문 완료 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 완료 = new 주문완료화면(page);
  const 목록 = new 상품목록화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인해 주문 완료 화면을 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 완료.열기();
    });

    await test.step('새로 가입한 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('주문 완료 화면에서 「주문 내역 보기」를 누른다', async () => {
      await 완료.주문내역보기.click();
      await 완료.주문내역제목.waitFor();
      await verify('주문 완료 화면에서 「주문 내역 보기」를 누르면 주문 내역 화면이 보인다', await 완료.주문내역제목.isVisible(), true);
      await 완료.열기();
    });

    await test.step('주문 완료 화면에서 「쇼핑 계속하기」를 누른다', async () => {
      await 완료.쇼핑계속하기.click();
      await 목록.제목.waitFor();
      await verify('주문 완료 화면에서 「쇼핑 계속하기」를 누르면 상품 목록 화면이 보인다', await 목록.제목.isVisible(), true);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
