import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 상품목록 } from './helpers/ops-data.helper.js';
import { 상품관리화면 } from './pages/products.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-121',
  name: '상품 검색칸에 상품명을 적으면 그 이름이 든 상품만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    상품명: z.string().describe('검색할 상품명 — 상품 관리 목록에 있는 상품의 이름이나 그 일부').default('블루투스 스피커'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 상품관리화면(page);
  let 기대: string[] = [];

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 상품관리화면.주소);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('검색할 상품명이 든 상품이 상품 목록에 있는지 확인한다', async () => {
    기대 = (await 상품목록(page, '')).filter((상품) => 상품.name.includes(params.상품명)).map((상품) => 상품.name).sort();
    await verify('상품 목록에 검색할 상품명이 든 상품이 있다', 기대.length > 0, true, { blocker: true });
  });

  await test.step('검색칸에 상품명을 적는다', async () => {
    await 화면.검색(params.상품명);
    const 보이는 = (await 화면.표시된상품명들()).sort();
    await verify('상품 검색칸에 상품명을 적으면 그 이름이 든 상품만 보인다', 보이는.join(', '), 기대.join(', '));
  });
});
