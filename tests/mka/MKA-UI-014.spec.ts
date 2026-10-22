import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 원 } from './helpers/app.helper.js';
import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 카드판매가글 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-014',
  name: '상품 목록 카드의 판매가가 천 단위 쉼표와 「원」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('판매가를 볼 상품 번호 — 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);

  await 서버로그인(request, 아이디, 비밀번호);
  const 상품 = await 상품읽기(request, params.상품번호);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    await verify('상품 목록에 상품 카드가 보인다', await 목록.카드찾기(상품.name), true, { blocker: true });
    await verify(
      '상품 목록 카드의 판매가가 천 단위 쉼표와 「원」으로 보인다',
      await 카드판매가글(driver, 목록.카드선택자(상품.name)),
      원(상품.salePrice),
    );
  });
});
