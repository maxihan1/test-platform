import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-398',
  name: '로그인이 풀린 상태로 「장바구니」를 누르면 로그인 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['로그인이 풀린 상태다'],
  held: '보류 — 앱의 로그인을 푸는 방법이 자료에 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 로그인 = new 로그인화면(driver);

  await test.step('상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 「장바구니」를 누른다', async () => {
    await 목록.장바구니누르기();
    const 글 = await 토스트글읽기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인이 풀린 상태로 「장바구니」를 누르면 로그인 화면으로 돌아간다', await 로그인.보이나(), true);
    await verify('토스트 「로그인이 필요합니다」가 보인다', 글, '로그인이 필요합니다');
  }, { capture: true });
});
