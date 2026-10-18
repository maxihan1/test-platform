import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-306',
  name: '결제 동의를 켜면 「<금액>원 결제하기」 버튼이 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 주문서의 최종 확인 단계에 와 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나로 주문서의 최종 확인 단계까지 간다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
    });

    await test.step('주문서 최종 확인 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 주문서의 최종 확인 단계에 와 있다', await 주문서.최종확인제목.isVisible(), true, { blocker: true });
    });

    await test.step('「주문 내용을 확인했으며 결제에 동의합니다」를 켠다', async () => {
      const 상품 = await 상품정보(page.request, params.productId);
      const 금액 = 상품.salePrice + (상품.salePrice >= 50000 ? 0 : 3000);
      await 주문서.동의.check();
      await verify('결제 동의를 켜면 「<금액>원 결제하기」 버튼이 눌린다', `${await 주문서.결제하기.innerText()} / ${(await 주문서.결제하기.isEnabled()) ? '눌림' : '눌리지 않음'}`, `${금액.toLocaleString('ko-KR')}원 결제하기 / 눌림`);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
