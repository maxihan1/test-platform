import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품하나주문하기, 주문상태 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-327',
  name: '남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['다른 새 회원이 주문을 하나 했다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 주문상세 = new 주문상세화면(page);
  const 준비: { 주인?: 회원정보; 나?: 회원정보; 주문번호?: string } = {};

  try {
    await test.step('다른 새 회원이 주문을 한다', async () => {
      await 방해창막기(page);
      준비.주인 = await 새회원으로로그인(request);
      준비.주문번호 = (await 상품하나주문하기(request, 2)).id;
    });

    await test.step('다른 새 회원의 주문이 있는지 확인한다', async () => {
      await verify('주문 상태가 「결제완료」다', await 주문상태(request, 준비.주문번호 ?? ''), '결제완료', { blocker: true });
    });

    await test.step('회원으로 다른 회원의 주문 상세 주소를 연다', async () => {
      준비.나 = await 새회원으로로그인(page.request);
      await 주문상세.열기(준비.주문번호 ?? '');
      await verify('남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다', await 주문상세.권한없음제목.isVisible(), true);
    });
  } finally {
    await 회원과주문정리(request, 준비.주인, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
    await 회원과주문정리(page.request, 준비.나);
  }
});
