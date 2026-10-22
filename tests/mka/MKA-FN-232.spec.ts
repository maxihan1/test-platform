import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 기기날짜, 칩날짜 } from './helpers/app.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-232',
  name: '「배송 희망일」 첫 칩은 오늘로부터 2일 뒤 날짜다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
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

  await test.step('주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    const 칩들 = await new 주문하기화면(driver).날짜칩글들();
    await verify('「배송 희망일」 첫 칩은 오늘로부터 2일 뒤 날짜다', 칩들[0], 칩날짜(await 기기날짜(driver, 2)));
  });

  await test.step('날짜 칩을 끝까지 민다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.날짜칩끝까지밀기();
    const 칩들 = await 화면.날짜칩글들();
    await verify('「배송 희망일」 마지막 칩은 오늘로부터 14일 뒤 날짜다', 칩들[칩들.length - 1], 칩날짜(await 기기날짜(driver, 14)));
  });
});
