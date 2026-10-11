import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 주문용상품번호 } from './helpers/member.helper.js';
import { 바로주문, 주문취소, 재고읽기 } from './helpers/order.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-109',
  name: '「주문 취소」 를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」 를 고르는 모달이 뜬다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원이 결제완료 주문을 하나 갖고 있다',
  ],
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
  let 처음재고 = 0;
  let 취소됨 = false;

  try {
    await 방해막기(page);

    await test.step('두 번째 회원으로 로그인해 결제완료 주문을 하나 만든다', async () => {
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      처음재고 = await 재고읽기(page.request, 주문용상품번호);
      const 주문 = await 바로주문(page.request, { productId: 주문용상품번호, qty: 1 });
      주문번호 = 주문.id ?? '';
      await verify('두 번째 회원이 주문을 하나 만들었다', 주문번호 !== '', true, { blocker: true });
    });

    await test.step('결제완료 주문 상세에서 「주문 취소」 를 누른다', async () => {
      await 상세.열기(주문번호);
      await verify('두 번째 회원 주문은 「결제완료」 상태다', await 상세.상태배지.innerText(), '결제완료', { blocker: true });
      await 상세.주문취소버튼.click();
      await 창.창.waitFor();
      await verify(
        '「주문 취소」 를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」 를 고르는 모달이 뜬다',
        { 모달: await 창.창.isVisible(), 사유: await 상세.취소창사유목록(창.창).allInnerTexts() },
        { 모달: true, 사유: ['단순 변심', '상품 정보 상이', '배송 지연', '기타'] },
      );
    });

    await test.step('취소 사유로 「기타」 를 고른다', async () => {
      await 상세.취소창사유선택(창.창).selectOption('기타');
      await verify('취소 사유로 「기타」 를 고르면 사유 입력칸이 나온다', await 상세.취소창사유입력칸(창.창).isVisible(), true);
    });

    await test.step('사유를 적고 「취소 신청」 을 누른다', async () => {
      await 상세.취소창사유입력칸(창.창).fill('테스트 취소');
      await 창.버튼('취소 신청').click();
      await 상세.취소사유행.waitFor();
      취소됨 = true;
      await verify('「취소 신청」 을 누르면 주문 상태가 「주문취소」 로 바뀐다', await 상세.상태배지.innerText(), '주문취소');
    });

    await test.step('취소한 주문의 상품 재고를 확인한다', async () => {
      await verify('주문을 취소하면 그 상품 재고가 주문 수량만큼 되돌아온다', await 재고읽기(page.request, 주문용상품번호), 처음재고);
    });
  } finally {
    if (주문번호 !== '' && !취소됨) await 주문취소(page.request, 주문번호);
  }
});
