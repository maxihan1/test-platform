import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기 } from './helpers/api.helper.js';
import { 내리며모으기 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-092',
  name: '상품이 10개인 「도서」 목록은 끝까지 내려도 상품이 10개다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    열한번째: z.number().describe('내려서 찾을 「전체」 목록의 상품 차례 — 11 이상 · 전체 상품 수 이하').default(11),
  }),
  expected: z.object({
    도서상품수: z.number().describe('도서 분류의 상품 수').default(10),
  }),
});

test(spec, async ({ driver, request, params, expected }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품이 10개인 「도서」 목록을 끝까지 내린다', async () => {
    const 도서 = await 상품목록읽기(request, { category: '도서', size: 50 });
    await verify('「도서」 분류의 상품이 기대 개수다', 도서.total, expected.도서상품수);
    await 목록.칩누르기('도서');
    await 목록.총개수바뀔때까지(`총 ${도서.total}개`);
    const 모음 = await 내리며모으기(driver, 목록, 도서.total + 1);
    await verify('상품이 10개인 「도서」 목록은 끝까지 내려도 상품이 10개다', 모음.length, expected.도서상품수);
  });

  await test.step('「전체」 목록을 11번째 상품까지 내린다', async () => {
    const 전체 = await 상품목록읽기(request, { page: Math.ceil(params.열한번째 / 10), size: 10 });
    const 찾을상품 = 전체.items[(params.열한번째 - 1) % 10];
    await verify('「전체」 분류의 상품이 11개 이상이다', 찾을상품 !== undefined, true);
    await 목록.칩누르기('전체');
    await 목록.총개수바뀔때까지(`총 ${전체.total}개`);
    const 찾음 = 찾을상품 === undefined ? false : await 목록.카드찾기(찾을상품.name);
    await verify('상품이 11개 이상인 「전체」 목록은 내리면 11번째 상품이 보인다', 찾음, true);
  });
});
