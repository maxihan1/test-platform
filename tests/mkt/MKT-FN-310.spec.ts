import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 기본배송정보, 병렬칸번호 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/order-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-310',
  name: '결제하면 상품 재고가 주문 수량만큼 줄어든다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 상태: { 회원?: 회원정보 } = {};
  const 상품번호 = [22, 30][병렬칸번호() % 2] ?? 22;
  const 수량 = 1;

  try {
    await test.step('새로 가입한 회원의 장바구니에 상품을 하나 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, 상품번호, 수량);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('결제 전후로 그 상품 재고를 견준다', async () => {
      const 전 = (await 상품정보(page.request, 상품번호)).stock;
      const 줄 = (await 장바구니목록(page.request))[0];
      if (!줄) throw new Error('장바구니에 담은 줄이 없다');
      await 주문서.열기([줄.id]);
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 완료.주문번호나올때까지();
      const 후 = (await 상품정보(page.request, 상품번호)).stock;
      await verify('결제하면 상품 재고가 주문 수량만큼 줄어든다', 전 - 후, 수량);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
