import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보, 주문응답재고부족으로 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 토스트 } from './components/toast.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-552',
  name: '주문 응답이 재고 부족이면 「재고가 부족한 상품이 있습니다: <상품명>」이 보이고 최종 확인 단계에 머문다',
  platforms: ['desktop', 'mobile'],
  precondition: ['주문 응답은 가짜 재고 부족 응답(모킹)이다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};
  const 알림 = new 토스트(page);

  try {
    await test.step('새로 가입한 회원이 상품 하나로 주문서의 최종 확인 단계까지 간다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
    });

    await test.step('주문서 최종 확인 단계가 열려 있는지 확인한다', async () => {
      await verify('주문 응답은 가짜 재고 부족 응답(모킹)이다', await 주문서.최종확인제목.isVisible(), true, { blocker: true });
    });

    await test.step('최종 확인 단계에서 결제 동의를 켜고 「결제하기」를 누른다', async () => {
      const 이름 = (await 상품정보(page.request, params.productId)).name;
      const 거두기 = await 주문응답재고부족으로(page, 이름);
      try {
        await 주문서.동의.check();
        await 주문서.결제하기.click();
        const 알림글 = await (await 알림.아무거나뜰때까지()).innerText();
        await verify('주문 응답이 재고 부족이면 「재고가 부족한 상품이 있습니다: <상품명>」이 보이고 최종 확인 단계에 머문다', `${알림글} / ${await 주문서.현재단계.innerText()}`, `재고가 부족한 상품이 있습니다: ${이름} / ③ 최종 확인`);
      } finally {
        await 거두기();
      }
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
