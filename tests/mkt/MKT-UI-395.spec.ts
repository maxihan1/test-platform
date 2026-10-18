import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 주소검색창 } from './pages/address-popup.page.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-395',
  name: '주문서 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다', '새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 상품 하나를 담아 주문서를 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
    });

    await test.step('새로 가입한 회원으로 주문서를 열어 두었는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
      await verify('주문서에 「주소 검색」 버튼이 보인다', await 주문서.주소검색.isVisible(), true, { blocker: true });
    });

    await test.step('주문서에서 「주소 검색」을 누른다', async () => {
      const [팝업쪽] = await Promise.all([page.waitForEvent('popup'), 주문서.주소검색.click()]);
      const 팝업 = new 주소검색창(팝업쪽);
      await 팝업.뜰때까지();
      await verify('주문서에서 「주소 검색」을 누르면 주소 검색 새 창이 열린다', await 팝업.제목.isVisible(), true);
      await 팝업쪽.close();
    });

    await test.step('주문서에서 「직접 입력」을 누른다', async () => {
      await 주문서.요청선택.selectOption({ label: '직접 입력' });
      await verify('주문서에서 「직접 입력」을 누르면 요청 사항 입력칸이 보인다', await 주문서.요청직접입력.isVisible(), true);
      await 주문서.요청선택.selectOption({ label: '선택 안 함' });
    });

    await test.step('주문서에서 「다음」을 누른다', async () => {
      await verify('주문서에서 「다음」을 누르면 버튼이 보이고 누를 수 있다', [await 주문서.다음.isVisible(), await 주문서.다음.isEnabled()], [true, true]);
    });

    await test.step('주문서에서 「장바구니로 가기」를 누른다', async () => {
      await 주문서.아무것도없이열기();
      await 주문서.장바구니로가기.click();
      await 장바구니.제목.waitFor();
      await verify('주문서에서 「장바구니로 가기」를 누르면 장바구니 화면이 보인다', await 장바구니.제목.isVisible(), true);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
