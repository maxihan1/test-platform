import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품하나주문하기, 주문상태 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-554',
  name: '취소 사유 입력칸에 201자를 적으면 200자까지만 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원에게 「결제완료」 주문이 하나 있다'],
  params: z.object({
    글자수: z.number().int().describe('사유 입력칸에 적을 글자 수 — 201 이상').default(201),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
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

    await test.step('주문 상세에서 사유 「기타」를 고른 모달을 연다', async () => {
      await 주문상세.열기(준비.주문번호 ?? '');
      await 주문상세.취소모달열기();
      await 주문상세.사유고르기('기타');
    });

    await test.step('사유 입력칸이 보이는지 확인한다', async () => {
      await verify('사유 입력칸이 보인다', await 주문상세.사유입력.isVisible(), true, { blocker: true });
    });

    await test.step('사유 입력칸에 201자를 적는다', async () => {
      await 주문상세.사유쓰기('가'.repeat(params.글자수));
      await verify('취소 사유 입력칸에 201자를 적으면 200자까지만 들어간다', (await 주문상세.사유입력.inputValue()).length, 200);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
  }
});
