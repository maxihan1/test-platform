import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-502',
  name: '검색칸에 낱말을 넣으면 「빠른 작업」에 「hana에 맞는 게시물」 · 「hana에 맞는 프로필」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('왼쪽 열에 검색칸이 보인다', await 검색.검색칸.isVisible(), true, { blocker: true });
  });

  await test.step('검색칸에 「hana」를 넣는다', async () => {
    await 검색.팝업열기();
    await 검색.넣기('hana');
    const 게시물 = await verify('「hana에 맞는 게시물」이 보인다', await 검색.빠른작업항목('hana에 맞는 게시물').isVisible(), true);
    const 프로필 = await verify('「hana에 맞는 프로필」이 보인다', await 검색.빠른작업항목('hana에 맞는 프로필').isVisible(), true);
    await verify('검색칸에 낱말을 넣으면 「빠른 작업」에 「hana에 맞는 게시물」 · 「hana에 맞는 프로필」이 보인다', 게시물 && 프로필, true);
  });
});
