import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-649',
  name: '기록 검색 칸에 「zz없는기록zz」를 적으면 「기록이 없습니다」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('기록 검색 칸에 적을 낱말 — 기록에 들어 있지 않은 낱말').default('zz없는기록zz'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('기록 검색 칸에 「zz없는기록zz」를 적는다', async () => {
    await 화면.검색(params.검색어);
    await verify('기록 검색 칸에 「zz없는기록zz」를 적으면 「기록이 없습니다」가 보인다', await 화면.비었음.isVisible(), true);
  });
});
