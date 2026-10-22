import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기 } from './helpers/api.helper.js';
import { 주문내역에서상세열기, 주문내역열기, 주문내역으로돌아오기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-120',
  name: '주문 내역에서 주문 카드를 누르면 주문 상세로 간다',
  platforms: ['android'],
  precondition: ['회원의 주문이 있다'],
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

    await test.step('주문 내역을 연다', async () => {
      await 주문내역열기(driver);
    });

    await test.step('주문 내역의 카드를 확인한다', async () => {
      await verify('주문 내역에 새로 만든 주문 카드가 보인다', await new 주문내역화면(driver).카드찾기(주문번호), true, { blocker: true });
    });

    await test.step('주문 내역에서 주문 카드를 누른다', async () => {
      const 열림 = await 주문내역에서상세열기(driver, 주문번호);
      await verify('주문 내역에서 주문 카드를 누르면 주문 상세로 간다', 열림 && (await new 주문상세화면(driver).보이는가()), true);
      await 주문내역으로돌아오기(driver);
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
