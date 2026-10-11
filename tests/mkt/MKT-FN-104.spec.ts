import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 재고1상품, 정상배송입력, 최종확인단계로가기 } from './helpers/shop.helper.js';
import { 바로주문, 주문취소 } from './helpers/order.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-104',
  name: '결제 직전에 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」 이 보이고 주문되지 않는다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원이 재고가 1인 상품으로 주문서를 열었다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 상품 = await 재고1상품(request);
  let 다른주문번호: string | undefined;

  try {
    await test.step('두 번째 회원으로 로그인해 재고가 1인 상품을 장바구니에 담는다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1 });
    });

    await test.step('두 번째 회원이 재고가 1인 상품으로 주문서를 연다', async () => {
      const [줄] = await 장바구니읽기(page.request);
      await 주문서.장바구니줄로열기([줄.id]);
      await 최종확인단계로가기(주문서, 정상배송입력());
      await 주문서.동의.check();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('재고가 1인 상품의 주문서 최종 확인 단계에서 「결제하기」 가 눌린다', await 주문서.결제하기.isEnabled(), true, { blocker: true });
    });

    await test.step('결제 직전에 그 상품 재고를 다른 주문으로 없앤 뒤 「결제하기」 를 누른다', async () => {
      const 다른주문 = await 바로주문(page.request, { productId: 상품.id, qty: 1 });
      다른주문번호 = 다른주문.id;
      await verify('다른 주문이 만들어진다', 다른주문.status, 201, { blocker: true });
      await 주문서.결제하기.click();
      const 문구 = 알림.글(`재고가 부족한 상품이 있습니다: ${상품.name}`);
      await 문구.first().waitFor();
      await verify(
        '결제 직전에 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」 이 보이고 주문되지 않는다',
        { 안내: await 문구.first().isVisible(), 주문완료화면: await 완료.제목.isVisible() },
        { 안내: true, 주문완료화면: false },
      );
    });
  } finally {
    if (다른주문번호 !== undefined) await 주문취소(page.request, 다른주문번호);
    await 장바구니비우기(page.request);
  }
});
