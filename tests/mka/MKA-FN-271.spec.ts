import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문목록읽기 } from './helpers/api.helper.js';
import { 주문내역열기, 주문만들어두기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-271',
  name: '「주문 내역」 카드가 주문일 최신순으로 보인다',
  platforms: ['android'],
  precondition: ['회원의 주문이 셋 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  try {
    await test.step('서버에서 주문을 만든다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      await 주문만들어두기(request, params.주문상품번호, 3);
    });

    await test.step('서버의 주문 건수를 확인한다', async () => {
      await verify('주문이 셋 이상 있다', (await 주문목록읽기(request)).length >= 3, true, { blocker: true });
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      const 열림 = await 주문내역열기(driver);
      await verify('주문 내역에 카드가 보인다', 열림, true, { blocker: true });

      const 보인번호들 = await new 주문내역화면(driver).보이는주문번호();
      const 최신순번호들 = [...(await 주문목록읽기(request))].sort((앞, 뒤) => 뒤.createdAt - 앞.createdAt).map((주문) => 주문.id);
      await verify('「주문 내역」 카드가 주문일 최신순으로 보인다', 보인번호들.join(', '), 최신순번호들.slice(0, 보인번호들.length).join(', '));
    });

    await test.step('주문 내역을 끝까지 내린다', async () => {
      const 모은번호들 = await new 주문내역화면(driver).끝까지모으기();
      const 서버번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      await verify('「주문 내역」에 기간을 거르지 않고 회원의 모든 주문이 보인다', [...모은번호들].sort().join(', '), [...서버번호들].sort().join(', '));
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
