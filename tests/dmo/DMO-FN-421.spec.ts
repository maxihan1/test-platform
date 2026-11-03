import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 뒤쪽상품, 아직안고른상품 } from './helpers/orders-flow.helper.js';
import { 상품고치기 } from './helpers/ops-data.helper.js';
import { 상품관리화면 } from './pages/products.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-421',
  name: '상품 「저장」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: [
    '관리자 계정으로 로그인해 있고 바꿀 상품의 원래 값을 적어 두었다',
    '상품 저장 응답은 가짜 응답(모킹)이다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 상품관리화면(page);
  let 상품 = 아직안고른상품;

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 상품관리화면.주소);
    });

    await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
      await 화면.틀.머리줄.waitFor();
      await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('바꿀 상품의 원래 값을 적어 둔다', async () => {
      상품 = await 뒤쪽상품(page, 5);
    });

    await test.step('적어 둔 상품이 상품 관리 화면에 있는지 확인한다', async () => {
      await 화면.열기();
      await 화면.가격칸(상품.name).waitFor();
      const 값 = await 화면.값들(상품.name);
      await verify('바꿀 상품의 원래 값을 적어 두었다', `${값.가격}, ${값.할인율}, ${값.재고}`, `${상품.price}, ${상품.discountRate}, ${상품.stock}`, { blocker: true });
    });

    await test.step('저장 응답이 실패하는 채로 「저장」을 누른다', async () => {
      const 주소 = '**/api/ops/products/*';
      await page.context().route(주소, async (route) => {
        if (route.request().method() !== 'PUT') {
          await route.fallback();
          return;
        }
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      });
      try {
        const 토스트글 = await 화면.저장하기(상품.name);
        const 안내 = await verify('오류 안내 토스트가 보인다', 토스트글.trim() !== '', true);
        const 멀쩡 = await verify('화면이 깨지지 않는다', await 화면.상품줄(상품.name).isVisible(), true);
        await verify('상품 「저장」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다', 안내 && 멀쩡, true);
      } finally {
        await page.context().unroute(주소);
      }
    });
  } finally {
    if (상품.id !== 0) await 상품고치기(page, 상품);
  }
});
