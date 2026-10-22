import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기, 쿠폰읽기 } from './helpers/api.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-082',
  name: '「쿠폰」에 「사용 안 함」과 회원이 가진 쿠폰이 보인다',
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
  let 쿠폰들: { id: string; label: string }[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
    상품명 = (await 상품읽기(request, params.상품번호)).name;
    쿠폰들 = await 쿠폰읽기(request);
    const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상품 목록이 보인다', 열림, true, { blocker: true });
  });

  await test.step('주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    const 화면 = new 주문하기화면(driver);
    const 사용안함 = await verify('「사용 안 함」이 보인다', await 화면.쿠폰글읽기('none'), '사용 안 함');
    const 화면쿠폰들: string[] = [];
    for (const 쿠폰 of 쿠폰들) 화면쿠폰들.push(await 화면.쿠폰글읽기(쿠폰.id));
    const 가진쿠폰 = await verify('회원이 가진 쿠폰이 보인다', 화면쿠폰들.join(', '), 쿠폰들.map((쿠폰) => 쿠폰.label).join(', '));
    await verify('「쿠폰」에 「사용 안 함」과 회원이 가진 쿠폰이 보인다', 사용안함 && 가진쿠폰, true);
  });
});
