import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 회원탈퇴화면 } from './pages/withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-402',
  name: '회원 탈퇴 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다', '새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 탈퇴 = new 회원탈퇴화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('회원 탈퇴 화면을 연다', async () => {
      await 탈퇴.열기();
    });

    await test.step('회원 탈퇴 화면이 열렸는지 확인한다', async () => {
      await verify('「탈퇴하기」 버튼이 보인다', await 탈퇴.탈퇴버튼.isVisible(), true, { blocker: true });
    });

    await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 누른다', async () => {
      await 탈퇴.동의켜기();
      await verify('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 누르면 「탈퇴하기」가 켜진다', await 탈퇴.탈퇴버튼.isEnabled(), true);
    });

    await test.step('회원 탈퇴 화면에서 「탈퇴하기」를 누른다', async () => {
      const 확인창글 = await 탈퇴.탈퇴하기누르기('취소');
      await verify(
        '회원 탈퇴 화면에서 「탈퇴하기」를 누르면 확인 창이 뜨고 취소하면 그대로다',
        { 확인창: 확인창글.length > 0, 회원남음: await 세션회원있는가(page.request), 같은화면: await 탈퇴.탈퇴버튼.isVisible() },
        { 확인창: true, 회원남음: true, 같은화면: true },
      );
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
