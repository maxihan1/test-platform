import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 뒤쪽상품, 아직안고른상품 } from './helpers/orders-flow.helper.js';
import { 상품고치기 } from './helpers/ops-data.helper.js';
import { 상품관리화면 } from './pages/products.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-138',
  name: '범위 밖 가격 50원을 저장하면 이유가 토스트로 보이고 다시 연 목록의 가격이 그대로다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: [
    '관리자 계정으로 로그인해 있고 바꿀 상품의 원래 값을 적어 두었다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    범위밖가격: z.number().describe('범위 밖 가격(원) — 100 미만 정수').default(50),
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
      상품 = await 뒤쪽상품(page, 3);
    });

    await test.step('적어 둔 상품이 상품 관리 화면에 있는지 확인한다', async () => {
      await 화면.열기();
      await 화면.가격칸(상품.name).waitFor();
      const 값 = await 화면.값들(상품.name);
      await verify('바꿀 상품의 원래 값을 적어 두었다', `${값.가격}, ${값.할인율}, ${값.재고}`, `${상품.price}, ${상품.discountRate}, ${상품.stock}`, { blocker: true });
    });

    await test.step('가격을 50원으로 적고 「저장」을 누른다', async () => {
      const 전 = await 화면.값들(상품.name);
      await 화면.값적기(상품.name, { 가격: params.범위밖가격 });
      const 토스트글 = await 화면.저장하기(상품.name);
      const 토스트 = await verify('이유가 토스트로 보인다', 토스트글.trim() !== '', true);
      await 화면.열기();
      const 후 = await 화면.값들(상품.name);
      const 그대로 = await verify('다시 연 목록의 가격이 그대로다', 후.가격, 전.가격);
      await verify('범위 밖 가격 50원을 저장하면 이유가 토스트로 보이고 다시 연 목록의 가격이 그대로다', 토스트 && 그대로, true);
    });
  } finally {
    if (상품.id !== 0) await 상품고치기(page, 상품);
  }
});
