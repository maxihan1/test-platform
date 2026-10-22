import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-121',
  name: '상품 상세에서 「+」를 누르면 수량이 1에서 2로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션없는상품번호: z.number().describe('수량을 바꿔 볼 옵션 없는 상품 번호 — 재고가 2개 이상인 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록에서 옵션 없는 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.옵션없는상품번호);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
  });

  await test.step('「+」를 누른 뒤 「−」를 누른다', async () => {
    await 상세.수량찾기();
    await 상세.더하기누르기();
    await 상세.수량바뀔때까지('2');
    const 둘 = await verify('「+」를 누르면 수량이 2다', await 상세.수량글(), '2');
    await 상세.빼기누르기();
    await 상세.수량바뀔때까지('1');
    const 하나 = await verify('「−」를 누르면 수량이 1이다', await 상세.수량글(), '1');
    await verify('상품 상세에서 「−」를 누르면 수량이 2에서 1로 바뀐다', 둘 && 하나, true);
  });

  await test.step('상품 상세에서 「+」를 누른다', async () => {
    const 처음 = await verify('처음 수량이 1이다', await 상세.수량글(), '1');
    await 상세.더하기누르기();
    await 상세.수량바뀔때까지('2');
    const 늘어남 = await verify('「+」를 누른 뒤 수량이 2다', await 상세.수량글(), '2');
    await verify('상품 상세에서 「+」를 누르면 수량이 1에서 2로 바뀐다', 처음 && 늘어남, true);
  });
});
