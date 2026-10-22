import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 사라질때까지 } from './helpers/app.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-144',
  name: '옵션을 고르지 않고 「장바구니 담기」를 누르면 토스트 「옵션을 선택하세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('색상 · 사이즈 옵션이 있는 상품 번호 — 품절이 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 알림 = new 토스트(driver);
  const 보관: { 앞줄들?: 장바구니줄[] } = {};

  try {
    await test.step('서버에서 장바구니를 비워 둔다', async () => {
      await 서버로그인(request, 아이디, 비밀번호);
      보관.앞줄들 = await 장바구니읽기(request);
      await 장바구니바꾸기(request, []);
      await verify('장바구니가 비어 있다', (await 장바구니읽기(request)).length, 0, { blocker: true });
    });

    await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 목록에서 옵션 상품 상세를 연다', async () => {
      const 상품 = await 상품읽기(request, params.옵션상품번호);
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('옵션 상품에서 옵션을 고르지 않고 「장바구니 담기」를 누른다', async () => {
      await 상세.담기누르기();
      await verify('옵션을 고르지 않고 「장바구니 담기」를 누르면 토스트 「옵션을 선택하세요」가 보인다', await 알림.글(), '옵션을 선택하세요');
    });

    await test.step('「색상」만 고르고 「바로 구매」를 누른다', async () => {
      await 사라질때까지(driver, '~toast');
      await 상세.색상찾아고르기();
      await 상세.바로구매누르기();
      await verify('「사이즈」를 고르지 않고 「바로 구매」를 누르면 토스트 「옵션을 선택하세요」가 보인다', await 알림.글(), '옵션을 선택하세요');
      const 주문열림 = await verify('주문하기 화면이 보이지 않는다', await new 주문하기화면(driver).보이는가(), false);
      const 상세남음 = await verify('상품 상세가 보인다', await 상세.보이는가(), true);
      await verify('「사이즈」를 고르지 않고 「바로 구매」를 누르면 상품 상세에 그대로 있다', 주문열림 && 상세남음, true);
    });
  } finally {
    if (보관.앞줄들 !== undefined) await 장바구니되돌리기(request, 보관.앞줄들);
  }
});
