import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-356',
  name: '문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
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

    await test.step('유형 · 제목 · 내용을 채워 문의를 등록한다', async () => {
      const 제목 = 고유글자('배송 문의');
      await 문의.채우기('배송', 제목, '배송이 언제 오는지 궁금합니다');
      await 문의.등록누르기();
      await 알림.뜰때까지('문의가 등록되었습니다');
      await verify(
        '문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다',
        { 맨위제목: (await 문의.내역제목들())[0], 맨위상태: (await 문의.내역상태들())[0] },
        { 맨위제목: 제목, 맨위상태: '답변 대기' },
      );
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
