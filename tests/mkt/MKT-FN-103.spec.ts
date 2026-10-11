import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 상품읽기, 옵션없는상품번호, 정상배송입력, 최종확인단계로가기 } from './helpers/shop.helper.js';
import { 재고읽기, 주문취소 } from './helpers/order.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-103',
  name: '결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 4자리 숫자 꼴 주문번호와 결제 금액이 보인다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원 장바구니에 상품이 하나 담겨 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품읽기(request, 옵션없는상품번호);
  let 처음재고 = 0;
  let 주문번호: string | undefined;

  try {
    await test.step('두 번째 회원으로 로그인해 장바구니에 상품 하나를 담는다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
      처음재고 = await 재고읽기(page.request, 상품.id);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1 });
    });

    await test.step('두 번째 회원 장바구니를 확인한다', async () => {
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('두 번째 회원 장바구니에 상품이 하나 담겨 있다', (await 장바구니읽기(page.request)).length, 1, { blocker: true });
    });

    await test.step('두 번째 회원으로 주문서를 채우고 동의한 뒤 「결제하기」 를 누른다', async () => {
      const [줄] = await 장바구니읽기(page.request);
      await 주문서.장바구니줄로열기([줄.id]);
      await 최종확인단계로가기(주문서, 정상배송입력());
      const 최종금액 = (await 주문서.금액요약읽기())['최종 결제 금액'];
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 완료.제목.waitFor();
      주문번호 = (await 완료.주문번호.innerText()).trim();
      await verify(
        '결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 4자리 숫자 꼴 주문번호와 결제 금액이 보인다',
        { 번호꼴: /^DM\d{8}-\d{4}$/.test(주문번호), 결제금액: await 완료.결제금액.innerText() },
        { 번호꼴: true, 결제금액: `${최종금액.toLocaleString('ko-KR')}원` },
      );
      await verify('주문 완료 화면에 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다', [await 완료.주문내역보기.isVisible(), await 완료.쇼핑계속하기.isVisible()], [true, true]);
    });

    await test.step('주문 뒤 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await verify('주문한 상품은 장바구니에서 빠진다', await 장바구니.줄(상품.name).count(), 0);
    });

    await test.step('주문한 상품의 재고를 확인한다', async () => {
      await verify('주문하면 그 상품 재고가 주문 수량만큼 줄어든다', await 재고읽기(page.request, 상품.id), 처음재고 - 1);
    });
  } finally {
    if (주문번호 !== undefined) await 주문취소(page.request, 주문번호);
    await 장바구니비우기(page.request);
  }
});
