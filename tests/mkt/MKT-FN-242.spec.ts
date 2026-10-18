import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-242',
  name: '「바로 구매」를 누르면 그 상품 하나만 담긴 주문서로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('바로 구매할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태인지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('옵션 없는 상품 상세에서 「바로 구매」를 누른다', async () => {
      const 이름 = (await 상품정보(page.request, params.productId)).name;
      await 상세.열기(params.productId);
      await verify('옵션 없는 상품 상세 화면이 열려 있다', await 상세.바로구매.isVisible(), true, { blocker: true });
      await 상세.바로구매.click();
      await 주문서.배송정보제목.waitFor();
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
      const 줄들 = await 주문서.상품목록줄들.allInnerTexts();
      await verify('「바로 구매」를 누르면 그 상품 하나만 담긴 주문서로 간다', `${줄들.length}줄, ${줄들[0]?.includes(이름) ? '상품명 포함' : '상품명 없음'}`, '1줄, 상품명 포함');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
