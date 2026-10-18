import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 기본배송정보, 장바구니응답가짜로 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-546',
  name: '결제 금액이 49,999원이면 할부 「3개월」을 고를 수 없다',
  platforms: ['desktop', 'mobile'],
  precondition: ['장바구니 응답은 가짜 응답(모킹)이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};
  let 상품금액 = 46999;

  try {
    const 이름 = (await 상품정보(page.request, 2)).name;
    const 거두기 = await 장바구니응답가짜로(page, () => [{ id: 1, productId: 2, name: 이름, unitPrice: 상품금액, qty: 1 }]);

    try {
      await test.step('새로 가입한 회원으로 로그인한다', async () => {
        await 방해창막기(page);
        상태.회원 = await 새회원으로로그인(page.request);
      });

      await test.step('결제 금액 49,999원 주문서에서 「신용카드」를 고른다', async () => {
        상품금액 = 46999;
        await 주문서.열기([1]);
        await 주문서.결제수단단계로가기(기본배송정보());
        await 주문서.결제수단고르기('신용카드');
        await verify('결제 금액이 49,999원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 49,999원', { blocker: true });
        await verify('결제 금액이 49,999원이면 할부 「3개월」을 고를 수 없다', await 주문서.할부옵션('3개월').isEnabled(), false);
      });

      await test.step('결제 금액 50,000원 주문서에서 「신용카드」를 고른다', async () => {
        상품금액 = 47000;
        await 주문서.열기([1]);
        await 주문서.결제수단단계로가기(기본배송정보());
        await 주문서.결제수단고르기('신용카드');
        await verify('결제 금액이 50,000원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 50,000원', { blocker: true });
        await verify('결제 금액이 50,000원이면 할부 「3개월」을 고를 수 있다', await 주문서.할부옵션('3개월').isEnabled(), true);
      });

    } finally {
      await 거두기();
    }
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
