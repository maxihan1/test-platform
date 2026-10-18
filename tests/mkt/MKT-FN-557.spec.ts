import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤, 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-557',
  name: '1:1 문의 「등록」을 빠르게 두 번 눌러도 문의가 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  const 알림 = new 토스트(page);
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
      await verify('문의 내역이 비어 있다', await 문의.문의수(), 0, { blocker: true });
    });

    await test.step('문의를 채우고 「등록」을 빠르게 두 번 누른다', async () => {
      await 문의.채우기('기타', 고유글자('두 번 누르기 문의'), '등록을 빠르게 두 번 눌러 본다');
      await 보낸요청끝날때까지(page, '/api/inquiries', () => 문의.등록빠르게두번누르기());
      await 알림.뜰때까지('문의가 등록되었습니다');
      await 두프레임뒤(page);
      await verify('1:1 문의 「등록」을 빠르게 두 번 눌러도 문의가 하나만 생긴다', await 문의.문의수(), 1);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
