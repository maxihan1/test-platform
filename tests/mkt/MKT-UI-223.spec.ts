import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-223',
  name: '「신용카드」를 고르면 카드사 드롭다운과 할부 드롭다운 「일시불」 · 「3개월」 · 「6개월」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 주문서의 결제 수단 단계에 와 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나로 주문서의 결제 수단 단계까지 간다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
      await 주문서.결제수단단계로가기(기본배송정보());
    });

    await test.step('주문서 결제 수단 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 주문서의 결제 수단 단계에 와 있다', await 주문서.결제수단제목.isVisible(), true, { blocker: true });
    });

    await test.step('「신용카드」를 고른다', async () => {
      await 주문서.결제수단고르기('신용카드');
      const 할부옵션들 = (await 주문서.할부.getByRole('option').allInnerTexts()).join(' · ');
      await verify('「신용카드」를 고르면 카드사 드롭다운과 할부 드롭다운 「일시불」 · 「3개월」 · 「6개월」이 보인다', [await 주문서.카드사.isVisible(), await 주문서.할부.isVisible(), 할부옵션들], [true, true, '일시불 · 3개월 · 6개월']);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
