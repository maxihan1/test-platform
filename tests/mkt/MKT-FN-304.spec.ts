import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-304',
  name: '최종 결제 금액이 상품 금액 − 쿠폰 할인 + 배송비와 같다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 주문서의 최종 확인 단계에 와 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나로 주문서의 최종 확인 단계까지 간다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
    });

    await test.step('주문서 최종 확인 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 주문서의 최종 확인 단계에 와 있다', await 주문서.최종확인제목.isVisible(), true, { blocker: true });
    });

    await test.step('「3,000원 할인」 쿠폰을 고르고 최종 확인 금액을 확인한다', async () => {
      const 상품 = await 상품정보(page.request, params.productId);
      await 주문서.이전.click();
      await 주문서.결제수단제목.waitFor();
      await 주문서.쿠폰고르기('3,000원 할인 (30,000원 이상 구매 시)');
      await 주문서.다음누르기();
      await 주문서.최종확인제목.waitFor();
      const 배송비 = 상품.salePrice >= 50000 ? 0 : 3000;
      await verify('최종 결제 금액이 상품 금액 − 쿠폰 할인 + 배송비와 같다', await 주문서.금액줄('최종 결제 금액').innerText(), `${(상품.salePrice - 3000 + 배송비).toLocaleString('ko-KR')}원`);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
