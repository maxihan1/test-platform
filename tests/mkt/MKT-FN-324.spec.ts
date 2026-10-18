import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품하나주문하기, 주문상태 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-324',
  name: '「기타」 사유 입력칸을 비우고 신청하면 주문이 취소되지 않고 「결제완료」로 남는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원에게 「결제완료」 주문이 하나 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 주문상세 = new 주문상세화면(page);
  const 준비: { 회원?: 회원정보; 주문번호?: string } = {};

  try {
    await test.step('새로 가입한 회원에게 결제완료 주문을 하나 만든다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
      준비.주문번호 = (await 상품하나주문하기(page.request, 2)).id;
    });

    await test.step('결제완료 주문이 있는지 확인한다', async () => {
      await verify('주문 상태가 「결제완료」다', await 주문상태(page.request, 준비.주문번호 ?? ''), '결제완료', { blocker: true });
    });

    await test.step('주문 상세에서 주문 취소 모달을 연다', async () => {
      await 주문상세.열기(준비.주문번호 ?? '');
      await 주문상세.취소모달열기();
    });

    await test.step('주문 취소 모달이 떠 있는지 확인한다', async () => {
      await verify('주문 취소 모달이 보인다', await 주문상세.창.isVisible(), true, { blocker: true });
    });

    await test.step('사유 「기타」에 입력칸을 비우고 「취소 신청」을 누른다', async () => {
      await 주문상세.사유고르기('기타');
      await 주문상세.취소신청누르기();
      await 주문상세.창오류.waitFor();
      await verify(
        '「기타」 사유 입력칸을 비우고 신청하면 주문이 취소되지 않고 「결제완료」로 남는다',
        { 서버주문상태: await 주문상태(page.request, 준비.주문번호 ?? ''), 화면상태: await 주문상세.상태글자() },
        { 서버주문상태: '결제완료', 화면상태: '결제완료' },
      );
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
  }
});
