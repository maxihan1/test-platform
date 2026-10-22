import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-030',
  name: '상품 목록 칩 아래에 「총 {N}개」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 전체 = await 상품목록읽기(request);
    const 글 = await verify('「총 {N}개」가 보인다', await 목록.총개수.getText().catch(() => ''), `총 ${전체.total}개`);
    const 아래 = await verify('「총 {N}개」가 칩 아래에 놓인다', await 목록.총개수가칩아래인가(), true);
    await verify('상품 목록 칩 아래에 「총 {N}개」가 보인다', 글 && 아래, true);
  });
});
