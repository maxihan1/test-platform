import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 사라질때까지 } from './helpers/app.helper.js';
import { 수량합 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-346',
  name: '「장바구니 담기」를 빠르게 두 번 눌러도 장바구니 수량은 한 번만 늘어난다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션없는상품번호: z.number().describe('담아 볼 옵션 없는 상품 번호 — 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
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

    await test.step('상품 목록에서 옵션 없는 상품 상세를 연다', async () => {
      const 상품 = await 상품읽기(request, params.옵션없는상품번호);
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('상품 상세에서 「장바구니 담기」를 빠르게 두 번 누른다', async () => {
      const 앞수량 = 수량합(await 장바구니읽기(request));
      await 상세.담기두번누르기();
      await new 토스트(driver).뜰때까지();
      await 사라질때까지(driver, '~toast');
      const 뒤수량 = 수량합(await 장바구니읽기(request));
      await verify('「장바구니 담기」를 빠르게 두 번 눌러도 장바구니 수량은 한 번만 늘어난다', 뒤수량 - 앞수량, 1);
    });
  } finally {
    if (보관.앞줄들 !== undefined) await 장바구니되돌리기(request, 보관.앞줄들);
  }
});
