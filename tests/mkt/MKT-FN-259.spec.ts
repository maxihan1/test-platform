import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 장바구니담기, 장바구니목록, 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-259',
  name: '선택 삭제를 확인하면 켠 줄이 지워지고 장바구니에 한 줄이 남는다',
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
    const 첫째이름 = (await 상품정보(page.request, params.firstProductId)).name;
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

    await test.step('첫 줄만 켜고 「선택 삭제」 확인 창에서 「확인」을 누른다', async () => {
      await 장바구니.열기();
      await 장바구니.줄체크(장바구니.줄(둘째이름)).uncheck();
      await 장바구니.선택삭제.click();
      const 확인창 = 창들.제목이('확인');
      await 창들.뜰때까지(확인창);
      const 보낸수 = await 보낸요청끝날때까지(page, '/api/cart', async () => {
        await 창들.버튼(확인창, '확인').click();
        await 창들.닫힐때까지(확인창);
      });
      if (보낸수 > 0) await 장바구니.줄(첫째이름).waitFor({ state: 'detached' });
      await verify('선택 삭제를 확인하면 켠 줄이 지워지고 장바구니에 한 줄이 남는다', (await 장바구니.줄들.getByRole('link').allInnerTexts()).join(', '), 둘째이름);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
