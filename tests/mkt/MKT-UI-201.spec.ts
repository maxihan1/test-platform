import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록, 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-201',
  name: '「선택 삭제」를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: z.object({
    firstProductId: z.number().describe('먼저 담을 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
    secondProductId: z.number().describe('이어 담을 상품 번호 — 옵션이 없고 품절이 아닌 다른 상품').default(3),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 창들 = new 모달(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 둘째이름 = (await 상품정보(page.request, params.secondProductId)).name;

    await test.step('새로 가입한 회원의 장바구니에 상품 두 줄을 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.firstProductId);
      await 장바구니담기(page.request, params.secondProductId);
    });

    await test.step('장바구니에 상품이 두 줄 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다', (await 장바구니목록(page.request)).length, 2, { blocker: true });
    });

    await test.step('첫 줄만 켜 두고 「선택 삭제」를 누른다', async () => {
      await 장바구니.열기();
      await 장바구니.줄체크(장바구니.줄(둘째이름)).uncheck();
      await 장바구니.선택삭제.click();
      const 확인창 = 창들.글이든('선택한 상품 1개를 삭제하시겠습니까?');
      await 창들.뜰때까지(확인창);
      await verify('「선택 삭제」를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다', await 확인창.isVisible(), true);
      await 창들.버튼(확인창, '취소').click();
      await 창들.닫힐때까지(확인창);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
