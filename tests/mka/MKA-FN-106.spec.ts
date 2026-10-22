import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 머리줄 } from './components/top-bar.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-106',
  name: '다른 화면에서 돌아오면 「장바구니 {N}」 숫자가 새로 담은 줄만큼 바뀐다',
  platforms: ['android'],
  precondition: ['장바구니에 「USB-C 허브」가 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션없는상품번호: z.number().describe('장바구니에 담아 볼 옵션 없는 상품 번호 — 품절이 아닌 상품').default(34),
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
      const 상품 = await 상품읽기(request, params.옵션없는상품번호);
      await verify('장바구니에 「USB-C 허브」가 없다', (await 장바구니읽기(request)).some((줄) => 줄.name === 상품.name), false, { blocker: true });
    });

    await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 목록에서 옵션 없는 상품 상세를 연다', async () => {
      const 상품 = await 상품읽기(request, params.옵션없는상품번호);
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('「USB-C 허브」 상세에서 「장바구니 담기」를 누르고 상품 목록으로 돌아온다', async () => {
      const 앞줄수 = (await 장바구니읽기(request)).length;
      await 상세.담기누르기();
      await new 토스트(driver).뜰때까지();
      await new 머리줄(driver).뒤로누르기();
      await 목록.열릴때까지();
      const 담은줄수 = (await 장바구니읽기(request)).length - 앞줄수;
      await verify('새로 담은 줄이 하나다', 담은줄수, 1);
      await 목록.장바구니글바뀔때까지(`장바구니 ${앞줄수 + 담은줄수}`);
      await verify('다른 화면에서 돌아오면 「장바구니 {N}」 숫자가 새로 담은 줄만큼 바뀐다', await 목록.장바구니버튼글.getText().catch(() => ''), `장바구니 ${앞줄수 + 담은줄수}`);
    });
  } finally {
    if (보관.앞줄들 !== undefined) await 장바구니되돌리기(request, 보관.앞줄들);
  }
});
