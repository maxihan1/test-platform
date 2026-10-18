import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-349',
  name: '문의 제목을 비우고 등록하면 내 문의 내역에 문의가 늘지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
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
      await verify('유형 칸이 보인다', await 문의.유형칸.isVisible(), true, { blocker: true });
    });

    await test.step('제목을 비우고 「등록」을 누른다', async () => {
      const 앞 = await 문의.문의수();
      await 문의.유형고르기('기타');
      await 문의.내용쓰기('제목을 비우고 등록해 본다');
      await 보낸요청끝날때까지(page, '/api/inquiries', () => 문의.등록누르기());
      await 알림.아무거나뜰때까지();
      await verify('문의 제목을 비우고 등록하면 내 문의 내역에 문의가 늘지 않는다', (await 문의.문의수()) - 앞, 0);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
