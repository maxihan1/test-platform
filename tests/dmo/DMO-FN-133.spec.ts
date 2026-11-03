import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 뒤쪽상품 } from './helpers/orders-flow.helper.js';
import { 상품관리화면 } from './pages/products.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-133',
  name: '할인율 칸에 값을 적으면 저장하기 전에 판매가 글자가 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    새할인율: z.number().describe('입력할 할인율(%) — 0 이상 90 이하, 지금 값과 다른 정수').default(50),
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

  await test.step('할인율 칸에 다른 값을 적는다', async () => {
    const 상품 = await 뒤쪽상품(page, 6);
    await 화면.가격칸(상품.name).waitFor();
    const 전 = await 화면.판매가(상품.name).innerText();
    await 화면.값적기(상품.name, { 할인율: params.새할인율 });
    const 후 = await 화면.판매가(상품.name).innerText();
    await verify('할인율 칸에 값을 적으면 저장하기 전에 판매가 글자가 바뀐다', 후 !== 전, true);
  });
});
