import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기, 주문읽기, 주문취소하기 } from './helpers/api.helper.js';
import { 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-286',
  name: '취소된 주문 상세에는 「취소 사유 {사유}」가 더 보인다',
  platforms: ['android'],
  precondition: ['취소된 주문이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    취소사유: z.enum(['단순 변심', '상품 정보 상이', '배송 지연']).describe('서버에서 주문을 취소할 때 쓸 사유').default('단순 변심'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 주문번호 = '';
  const 상세 = new 주문상세화면(driver);
  try {
    await test.step('서버에서 주문을 만들고 취소한다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      주문번호 = await 주문만들기(request, { productId: params.주문상품번호 });
      await 주문취소하기(request, 주문번호, params.취소사유);
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('그 주문의 상세를 연다', async () => {
      await 주문상세열기(driver, 주문번호);
      await verify('취소된 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '주문취소', { blocker: true });

      const 취소사유 = (await 주문읽기(request, 주문번호)).cancel?.reason ?? '';
      const 사유줄 = (await 상세.끝까지읽기()).find((글) => 글.startsWith('취소 사유')) ?? '';
      await verify('취소된 주문 상세에는 「취소 사유 {사유}」가 더 보인다', 사유줄, `취소 사유 ${취소사유}`);
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
