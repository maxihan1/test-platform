import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 회원탈퇴화면 } from './pages/withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-337',
  name: '탈퇴를 확인하면 홈 화면으로 가고 머리글에 「로그인」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
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

    await test.step('회원 탈퇴 화면에서 체크박스를 켠다', async () => {
      await 탈퇴.열기();
      await 탈퇴.동의켜기();
    });

    await test.step('탈퇴 버튼을 누를 수 있는지 확인한다', async () => {
      await verify('「탈퇴하기」가 눌린다', await 탈퇴.탈퇴버튼.isEnabled(), true, { blocker: true });
    });

    await test.step('탈퇴 확인 창에서 확인을 누른다', async () => {
      await 탈퇴.탈퇴하기누르기('확인');
      await 탈퇴.머리글.로그아웃꼴일때까지();
      await 탈퇴.머리글.좁으면메뉴열기();
      await verify(
        '탈퇴를 확인하면 홈 화면으로 가고 머리글에 「로그인」이 보인다',
        { 홈: new URL(page.url()).pathname, 로그인링크: await 탈퇴.머리글.로그인링크.isVisible() },
        { 홈: '/', 로그인링크: true },
      );
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
