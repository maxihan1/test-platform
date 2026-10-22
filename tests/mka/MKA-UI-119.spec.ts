import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-119',
  name: '주문하기 버튼 반응',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 10% 쿠폰을 쓸 수 있는 품절 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 상품명 = '';

  await test.step('일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
    상품명 = (await 상품읽기(request, params.상품번호)).name;
    const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상품 목록이 보인다', 열림, true, { blocker: true });
  });

  await test.step('상품 상세에서 「바로 구매」를 눌러 주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
  });

  await test.step('주문하기에서 「주소 검색」을 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    await verify('주문하기에서 「주소 검색」을 누르면 주소 검색 창이 뜬다', await 화면.주소검색창열기(), true);
  });

  await test.step('주소 검색 창에서 「닫기」를 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    await verify('주소 검색 창에서 「닫기」를 누르면 창이 닫힌다', await 화면.주소검색창닫기(), true);
  });

  await test.step('주문하기에서 날짜 칩을 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.첫날짜칩누르기();
    await verify('주문하기에서 날짜 칩을 누르면 그 칩이 골라진다', await 화면.날짜칩골라졌나(0), true);
  });

  await test.step('주문하기에서 쿠폰을 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    const 앞글 = await 화면.금액글('~discount_amount');
    await 화면.쿠폰고르기('RATE10');
    await 화면.찾기('~discount_amount');
    await verify('주문하기에서 쿠폰을 누르면 「쿠폰 할인」 금액이 바뀐다', await 화면.금액바뀔때까지('~discount_amount', 앞글), true);
  });

  await test.step('주문하기에서 동의 체크박스를 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.동의누르기();
    await verify('주문하기에서 동의 체크박스를 누르면 결제하기 버튼이 눌리게 된다', await 화면.결제눌리나(), true);
  });
});
