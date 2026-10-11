import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니담기, 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 내주문번호들, 옵션없는상품번호, 정상배송입력, 최종확인단계로가기 } from './helpers/shop.helper.js';
import { 주문취소 } from './helpers/order.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-094',
  name: '「결제하기」 를 빠르게 두 번 눌러도 주문은 하나만 생긴다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원 장바구니에 상품이 하나 담겨 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 머리 = new 머리글(page);
  let 처음주문번호: string[] = [];

  try {
    await test.step('두 번째 회원으로 로그인해 장바구니에 상품 하나를 담는다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
      처음주문번호 = (await 내주문번호들(page.request)).map((주문) => 주문.id);
      await 장바구니담기(page.request, { productId: 옵션없는상품번호, qty: 1 });
    });

    await test.step('두 번째 회원 장바구니를 확인한다', async () => {
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('두 번째 회원 장바구니에 상품이 하나 담겨 있다', (await 장바구니읽기(page.request)).length, 1, { blocker: true });
    });

    await test.step('주문서를 채우고 「결제하기」 를 빠르게 두 번 누른다', async () => {
      const [줄] = await 장바구니읽기(page.request);
      await 주문서.장바구니줄로열기([줄.id]);
      await 최종확인단계로가기(주문서, 정상배송입력());
      await 주문서.동의.check();
      await 주문서.결제하기.click({ clickCount: 2 });
      await 완료.제목.waitFor();
      await page.waitForTimeout(1000);
      const 새주문 = (await 내주문번호들(page.request)).filter((주문) => !처음주문번호.includes(주문.id));
      await verify('「결제하기」 를 빠르게 두 번 눌러도 주문은 하나만 생긴다', 새주문.length, 1);
    });
  } finally {
    const 새주문 = (await 내주문번호들(page.request)).filter((주문) => !처음주문번호.includes(주문.id));
    for (const 주문 of 새주문) await 주문취소(page.request, 주문.id);
    await 장바구니비우기(page.request);
  }
});
