import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 주문용상품번호 } from './helpers/member.helper.js';
import { 바로주문, 주문취소 } from './helpers/order.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-157',
  name: '사유 입력칸에 201자를 적으면 200자까지만 들어간다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원이 결제완료 주문을 하나 갖고 있다',
  ],
  techniques: ['경계값 분석'],
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

    await test.step('주문 상세에서 「주문 취소」 를 눌러 사유 「기타」 를 고른다', async () => {
      await 상세.열기(주문번호);
      await verify('두 번째 회원 주문은 「결제완료」 상태다', await 상세.상태배지.innerText(), '결제완료', { blocker: true });
      await 상세.주문취소버튼.click();
      await 창.창.waitFor();
      await 상세.취소창사유선택(창.창).selectOption('기타');
      await 상세.취소창사유입력칸(창.창).waitFor();
      await verify('취소 모달에 사유 입력칸이 보인다', await 상세.취소창사유입력칸(창.창).isVisible(), true, { blocker: true });
    });

    await test.step('취소 사유 「기타」 의 사유 입력칸에 201자를 적는다', async () => {
      await 상세.취소창사유입력칸(창.창).fill('가'.repeat(201));
      await verify('사유 입력칸에 201자를 적으면 200자까지만 들어간다', (await 상세.취소창사유입력칸(창.창).inputValue()).length, 200);
    });

    await test.step('취소 사유 「기타」 의 사유 입력칸에 200자를 적는다', async () => {
      await 상세.취소창사유입력칸(창.창).fill('나'.repeat(200));
      await verify('사유 입력칸에 200자를 적으면 200자가 모두 들어간다', await 상세.취소창사유입력칸(창.창).inputValue(), '나'.repeat(200));
    });
  } finally {
    if (주문번호 !== '') await 주문취소(page.request, 주문번호);
  }
});
