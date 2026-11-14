import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-655',
  name: '「종류」를 「로그인」으로 고르면 「메뉴」 칸이 모두 「로그인」인 줄만 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「운영자 작업」 탭이 선택돼 있다', await 화면.선택한탭('운영자 작업').isVisible(), true, { blocker: true });
  });

  await test.step('운영자 작업 「종류」를 「로그인」으로 고른다', async () => {
    await 화면.종류고르기('로그인');
    const 메뉴들 = (await 화면.칸들('메뉴').allInnerTexts()).map((글) => 글.trim());
    await verify('「종류」를 「로그인」으로 고르면 「메뉴」 칸이 모두 「로그인」인 줄만 보인다', [...new Set(메뉴들)].join(', '), '로그인');
  });
});
