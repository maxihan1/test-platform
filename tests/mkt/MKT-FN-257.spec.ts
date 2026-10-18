import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록, 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-257',
  name: '장바구니 수량을 2로 바꾸면 줄 금액이 판매가의 두 배로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 상품 = await 상품정보(page.request, params.productId);

    await test.step('새로 가입한 회원의 장바구니에 상품을 하나 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.productId);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니 줄의 「+」를 눌러 수량을 2로 바꾼다', async () => {
      await 장바구니.열기();
      const 줄 = 장바구니.줄(상품.name);
      await 장바구니.줄수량늘리기(줄).click();
      await 장바구니.수량칸값이될때까지(줄, '2');
      await verify('장바구니 수량을 2로 바꾸면 줄 금액이 판매가의 두 배로 바뀐다', await 장바구니.줄금액(줄).innerText(), `${(상품.salePrice * 2).toLocaleString('ko-KR')}원`);
    });

    await test.step('결제 요약의 금액을 확인한다', async () => {
      const 줄 = 장바구니.줄(상품.name);
      await verify('장바구니 수량을 바꾸면 결제 요약 「상품 금액」이 바뀐 줄 금액과 같다', await 장바구니.요약값('상품 금액').innerText(), await 장바구니.줄금액(줄).innerText());
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
