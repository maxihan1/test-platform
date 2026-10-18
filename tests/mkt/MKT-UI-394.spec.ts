import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-394',
  name: '장바구니 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 창들 = new 모달(page);
  const 주문서 = new 주문서화면(page);
  const 상세 = new 상품상세화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 이름 = (await 상품정보(page.request, params.productId)).name;

    await test.step('새로 가입한 회원으로 상품 하나를 담고 장바구니를 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.productId);
      await 장바구니.열기();
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('장바구니에 상품이 한 줄 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니에서 「전체 선택」을 누른다', async () => {
      await 장바구니.전체선택.click();
      await verify('장바구니에서 「전체 선택」을 누르면 모든 줄이 꺼진다', `켜진 줄 ${await 장바구니.켜진줄수()}개`, '켜진 줄 0개');
      await 장바구니.전체선택.click();
    });

    await test.step('장바구니에서 「선택 삭제」를 누른다', async () => {
      await 장바구니.선택삭제.click();
      await 창들.뜰때까지(창들.제목이('확인'));
      await verify('장바구니에서 「선택 삭제」를 누르면 확인 창이 뜬다', await 창들.제목이('확인').isVisible(), true);
    });

    await test.step('장바구니에서 「취소」를 누른다', async () => {
      await 창들.버튼(창들.제목이('확인'), '취소').click();
      await 창들.닫힐때까지(창들.제목이('확인'));
      await verify('장바구니에서 「취소」를 누르면 선택 삭제 확인 창이 닫힌다', await 창들.제목이('확인').isVisible(), false);
    });

    await test.step('장바구니에서 「주문하기」를 누른다', async () => {
      await 장바구니.주문하기.click();
      await 주문서.배송정보제목.waitFor();
      await verify('장바구니에서 「주문하기」를 누르면 주문서 화면이 보인다', await 주문서.배송정보제목.isVisible(), true);
      await 장바구니.열기();
    });

    await test.step('장바구니에서 「상품명」을 누른다', async () => {
      await 장바구니.줄상품명(장바구니.줄(이름)).click();
      await 상세.큰이미지버튼.waitFor();
      await verify('장바구니에서 「상품명」을 누르면 그 상품 상세가 보인다', new URL(page.url()).pathname, `/shop/${params.productId}`);
      await 장바구니.열기();
    });

    await test.step('장바구니에서 「수량 늘리기」를 누른다', async () => {
      const 줄 = 장바구니.줄(이름);
      await 장바구니.줄수량늘리기(줄).click();
      await 장바구니.수량칸값이될때까지(줄, '2');
      await verify('장바구니에서 「수량 늘리기」를 누르면 그 줄 수량이 2가 된다', await 장바구니.줄수량칸(줄).inputValue(), '2');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
