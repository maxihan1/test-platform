import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기, 주문읽기 } from './helpers/api.helper.js';
import { 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-351',
  name: '「취소 사유」에 공백만 넣고 「취소하기」를 누르면 빈 값처럼 막혀 주문이 「결제완료」 그대로다',
  platforms: ['android'],
  precondition: ['결제완료 주문이 하나 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    취소사유: z.string().describe('「기타」 취소 사유 칸에 넣을 글 — 공백만').default('   '),
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

    await test.step('「주문 취소」 창을 연다', async () => {
      await 상세.취소창열기();
    });

    await test.step('「주문 취소」 창을 확인한다', async () => {
      await verify('「주문 취소」 창이 보인다', await 상세.창보이나(), true, { blocker: true });
    });

    await test.step('「기타」를 고르고 「취소 사유」에 공백만 넣어 「취소하기」를 누른다', async () => {
      await 상세.사유고르기(3);
      await 상세.취소사유적기(params.취소사유);
      await 상세.취소하기누르기();
      await new 토스트(driver).뜰때까지();
      await verify('「취소 사유」에 공백만 넣고 「취소하기」를 누르면 빈 값처럼 막혀 주문이 「결제완료」 그대로다', (await 주문읽기(request, 주문번호)).status, '결제완료');
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
