import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 주문용상품번호 } from './helpers/member.helper.js';
import { 바로주문, 주문취소 } from './helpers/order.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-110',
  name: '「기타」 사유를 비우고 「취소 신청」 을 누르면 주문 상태가 「결제완료」 그대로다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원이 결제완료 주문을 하나 갖고 있다',
  ],
  techniques: ['동등 분할'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);
  const 창 = new 모달(page);
  const 머리 = new 머리글(page);
  let 주문번호 = '';

  try {
    await 방해막기(page);

    await test.step('두 번째 회원으로 로그인해 결제완료 주문을 하나 만든다', async () => {
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      const 주문 = await 바로주문(page.request, { productId: 주문용상품번호, qty: 1 });
      주문번호 = 주문.id ?? '';
      await verify('두 번째 회원이 주문을 하나 만들었다', 주문번호 !== '', true, { blocker: true });
    });

    await test.step('취소 사유 「기타」 에서 사유를 비운 채 「취소 신청」 을 누른다', async () => {
      await 상세.열기(주문번호);
      await verify('두 번째 회원 주문은 「결제완료」 상태다', await 상세.상태배지.innerText(), '결제완료', { blocker: true });
      await 상세.주문취소버튼.click();
      await 창.창.waitFor();
      await 상세.취소창사유선택(창.창).selectOption('기타');
      await 창.버튼('취소 신청').click();
      await 상세.취소창오류문구(창.창).waitFor();
      await verify('「기타」 사유를 비우고 「취소 신청」 을 누르면 주문 상태가 「결제완료」 그대로다', await 상세.상태배지.innerText(), '결제완료');
    });
  } finally {
    if (주문번호 !== '') await 주문취소(page.request, 주문번호);
  }
});
