import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기 } from './helpers/api.helper.js';
import { 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-098',
  name: '「주문 취소」 창에 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」와 「취소하기」 · 「닫기」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['결제완료 주문이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 주문번호 = '';
  const 상세 = new 주문상세화면(driver);
  try {
    await test.step('서버에서 주문을 만든다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      주문번호 = await 주문만들기(request, { productId: params.주문상품번호 });
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('주문 상세를 연다', async () => {
      await 주문상세열기(driver, 주문번호);
    });

    await test.step('결제완료 주문의 상세를 확인한다', async () => {
      await verify('결제완료 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '결제완료', { blocker: true });
    });

    await test.step('「주문 취소」를 누른다', async () => {
      await 상세.취소창열기();
      const 사유 = await verify('사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」가 보인다', (await 상세.사유이름들()).join(', '), '단순 변심, 상품 정보 상이, 배송 지연, 기타');
      const 취소하기 = await verify('「취소하기」 버튼이 보인다', await 상세.취소하기.isDisplayed(), true);
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 상세.창닫기.isDisplayed(), true);
      await verify('「주문 취소」 창에 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」와 「취소하기」 · 「닫기」 버튼이 보인다', 사유 && 취소하기 && 닫기, true);
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
