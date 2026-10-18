import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보, 범위안일요일 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-290',
  name: '배송 희망일로 일요일을 고르면 「일요일은 배송하지 않습니다」가 보이고 배송 정보 단계에 머문다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다'],
  techniques: ['결정 테이블'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나를 담고 주문서를 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
    });

    await test.step('주문서 배송 정보 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 상품 하나로 주문서를 열어 두었다', await 주문서.배송정보제목.isVisible(), true, { blocker: true });
    });

    await test.step('배송 희망일로 범위 안의 일요일을 넣고 「다음」을 누른다', async () => {
      await 주문서.배송정보채우기({ ...기본배송정보(범위안일요일()) });
      await 주문서.다음누르기();
      const 오류글 = await 주문서.오류나올때까지('deliveryDate');
      await verify('배송 희망일로 일요일을 고르면 「일요일은 배송하지 않습니다」가 보이고 배송 정보 단계에 머문다', `${오류글} / ${await 주문서.현재단계.innerText()}`, '일요일은 배송하지 않습니다 / ① 배송 정보');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
