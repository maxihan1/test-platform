import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 뒤쪽상품 } from './helpers/orders-flow.helper.js';
import { 상품관리화면 } from './pages/products.page.js';
import { 쇼핑몰상품상세화면 } from './pages/shop-product.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-144',
  name: '상품 관리 화면에서 상품명을 누르면 쇼핑몰 상품 상세가 새 탭으로 열린다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
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

  await test.step('상품명 링크를 누른다', async () => {
    const 상품 = await 뒤쪽상품(page, 7);
    await 화면.가격칸(상품.name).waitFor();
    const 새탭 = await 화면.상품링크누르기(상품.name);
    const 열림 = await verify('새 탭이 열린다', 새탭 !== null, true);
    let 경로 = '';
    if (새탭) {
      await new 쇼핑몰상품상세화면(새탭).제목.waitFor();
      경로 = new URL(새탭.url()).pathname;
      await 새탭.close();
    }
    const 상세 = await verify('쇼핑몰 상품 상세가 열린다', 경로, `/shop/${상품.id}`);
    await verify('상품 관리 화면에서 상품명을 누르면 쇼핑몰 상품 상세가 새 탭으로 열린다', 열림 && 상세, true);
  });
});
