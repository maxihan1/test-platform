import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 상태별주문번호, 주문만들기, 주문목록읽기, 주문취소하기 } from './helpers/api.helper.js';
import { 주문내역에서상세열기, 주문내역으로돌아오기, 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-291',
  name: '「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['「배송중」 주문이 있다', '「주문취소」 주문이 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 배송중번호: string | undefined;
  let 취소번호 = '';
  const 상세 = new 주문상세화면(driver);
  try {
    await test.step('서버에서 「배송중」 주문을 찾고 취소한 주문을 만든다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      배송중번호 = await 상태별주문번호(request, '배송중');
      취소번호 = await 주문만들기(request, { productId: params.주문상품번호 });
      await 주문취소하기(request, 취소번호);
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('「배송중」 주문이 있는지 확인한다', async () => {
      await verify('「배송중」 주문이 있다', 배송중번호 !== undefined, true, { blocker: true });
    });

    await test.step('그 주문의 상세를 연다', async () => {
      await 주문상세열기(driver, 배송중번호 ?? '');
      await verify('「배송중」 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '배송중', { blocker: true });

      await verify('「배송중」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소보이나(), false);
    });

    await test.step('「주문취소」 주문의 상세를 연다', async () => {
      await 주문내역으로돌아오기(driver);
      await 주문내역에서상세열기(driver, 취소번호);
      await verify('「주문취소」 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '주문취소', { blocker: true });

      await verify('「주문취소」 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소보이나(), false);
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
