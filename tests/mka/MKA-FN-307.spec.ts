import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  새주문모두취소,
  상품읽기,
  서버로그인,
  장바구니되돌리기,
  장바구니바꾸기,
  장바구니에담기,
  장바구니읽기,
  주문만들기,
  주문목록읽기,
  주문취소하기,
  type 장바구니줄,
} from './helpers/api.helper.js';
import { 장바구니열기, 상품목록으로돌아가기, 주문내역에서상세열기, 주문내역으로돌아오기, 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-307',
  name: '웹에서 취소한 주문은 주문 상세를 다시 열면 「주문취소」로 보인다',
  platforms: ['android'],
  precondition: ['결제완료 주문이 하나 있다', '장바구니에 「USB-C 허브」가 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    옵션없는상품번호: z.number().describe('웹에서 장바구니에 담을 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 앞줄들 = null as 장바구니줄[] | null;
  let 주문번호 = '';
  const 상세 = new 주문상세화면(driver);
  try {
    await test.step('서버에서 주문을 만들고 장바구니를 비운다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      주문번호 = await 주문만들기(request, { productId: params.주문상품번호 });
      앞줄들 = await 장바구니바꾸기(request, []);
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

    await test.step('웹에서 그 주문을 취소한 뒤 주문 상세를 다시 연다', async () => {
      await 주문취소하기(request, 주문번호);
      await 주문내역으로돌아오기(driver);
      await 주문내역에서상세열기(driver, 주문번호);
      await 상세.상태바뀔때까지('주문취소');
      await verify('웹에서 취소한 주문은 주문 상세를 다시 열면 「주문취소」로 보인다', await 상세.상태.getText().catch(() => ''), '주문취소');
    });

    await test.step('장바구니에 「USB-C 허브」가 없는지 확인한다', async () => {
      const 허브이름 = (await 상품읽기(request, params.옵션없는상품번호)).name;
      const 담긴이름들 = (await 장바구니읽기(request)).map((줄) => 줄.name);
      await verify('「USB-C 허브」가 장바구니에 없다', 담긴이름들.includes(허브이름), false, { blocker: true });
    });

    await test.step('웹에서 장바구니에 상품을 담은 뒤 장바구니를 다시 연다', async () => {
      await 장바구니에담기(request, { productId: params.옵션없는상품번호 });
      await 상품목록으로돌아가기(driver);
      await 장바구니열기(driver);
      const 허브이름 = (await 상품읽기(request, params.옵션없는상품번호)).name;
      await verify('웹에서 담은 상품은 장바구니를 다시 열면 보인다', (await new 장바구니화면(driver).줄이름들()).includes(허브이름), true);
    });
  } finally {
    try {
      if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
    } finally {
      if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
    }
  }
});
