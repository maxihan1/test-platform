import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 상품목록 } from './helpers/ops-data.helper.js';
import { 상품관리화면 } from './pages/products.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-118',
  name: '상품 관리 화면에서 분류를 「도서」로 고르면 분류가 「도서」인 상품만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    분류: z.enum(['패션', '전자기기', '도서', '식품']).describe('고를 분류 — 패션, 전자기기, 도서, 식품 가운데 하나').default('도서'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 상품관리화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 상품관리화면.주소);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('분류를 「도서」로 고른다', async () => {
    await 화면.분류고르기(params.분류);
    const 보이는 = (await 화면.표시된상품명들()).sort();
    const 기대 = (await 상품목록(page, '')).filter((상품) => 상품.category === params.분류).map((상품) => 상품.name).sort();
    await verify('상품 관리 화면에서 분류를 「도서」로 고르면 분류가 「도서」인 상품만 보인다', 보이는.join(', '), 기대.join(', '));
  });
});
