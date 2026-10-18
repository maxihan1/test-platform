import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 기본배송정보, 장바구니응답가짜로 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-549',
  name: '상품 금액이 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다',
  platforms: ['desktop', 'mobile'],
  precondition: ['장바구니 응답은 가짜 응답(모킹)이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};
  let 상품금액 = 29999;

  try {
    const 이름 = (await 상품정보(page.request, 2)).name;
    const 거두기 = await 장바구니응답가짜로(page, () => [{ id: 1, productId: 2, name: 이름, unitPrice: 상품금액, qty: 1 }]);

    try {
      await test.step('새로 가입한 회원으로 로그인한다', async () => {
        await 방해창막기(page);
        상태.회원 = await 새회원으로로그인(page.request);
      });

      await test.step('새로 가입한 회원으로 로그인해 있는지 확인한다', async () => {
        await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
      });

      await test.step('상품 금액 29,999원 주문서의 쿠폰 드롭다운을 연다', async () => {
        상품금액 = 29999;
        await 주문서.열기([1]);
        await 주문서.결제수단단계로가기(기본배송정보());
        await 주문서.쿠폰불러올때까지();
        await verify('상품 금액이 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다', await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isEnabled(), false);
      });

      await test.step('상품 금액 30,000원 주문서의 쿠폰 드롭다운을 연다', async () => {
        상품금액 = 30000;
        await 주문서.열기([1]);
        await 주문서.결제수단단계로가기(기본배송정보());
        await 주문서.쿠폰불러올때까지();
        await verify('상품 금액이 30,000원이면 「3,000원 할인」 쿠폰을 고를 수 있다', await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isEnabled(), true);
      });

    } finally {
      await 거두기();
    }
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
