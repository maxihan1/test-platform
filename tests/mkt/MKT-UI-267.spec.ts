import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-267',
  name: '1:1 문의에 「답변 알림 이메일 받기」 체크박스가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
    });

    await test.step('1:1 문의 화면이 열렸는지 확인한다', async () => {
      await verify('유형 칸이 보인다', await 문의.유형칸.isVisible(), true, { blocker: true });
    });

    await test.step('1:1 문의 화면의 알림 체크박스를 확인한다', async () => {
      await verify('1:1 문의에 「답변 알림 이메일 받기」 체크박스가 보인다', await 문의.알림체크.isVisible(), true);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
