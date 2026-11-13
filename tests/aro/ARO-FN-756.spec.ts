import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이메일에만숫자가든계정찾기 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-756',
  name: '이메일에만 든 숫자로 찾으면 그 계정이 보이지 않는다',
  precondition: ['이메일에만 숫자가 든 계정이 있다'],
  held: '보류 — 이메일에만 숫자가 든 계정이 없다',
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 대상: { 아이디: string; 숫자: string } | null = null;

  await test.step('운영자 계정으로 로그인하고 이메일에만 숫자가 든 계정을 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    대상 = await 이메일에만숫자가든계정찾기(page);
  });

  await test.step('「유저 · 제재」에서 이메일에만 숫자가 든 계정을 확인한다', async () => {
    await verify('이메일에만 숫자가 든 계정이 있다', 대상 !== null, true, { blocker: true });
    await 화면.열기();
    await verify('유저 표가 보인다', await 화면.유저표.isVisible(), true, { blocker: true });
  });

  await test.step('그 이메일의 숫자를 유저 검색 칸에 적는다', async () => {
    await 화면.검색(대상?.숫자 ?? '');
    await verify('이메일에만 든 숫자로 찾으면 그 계정이 보이지 않는다', await 화면.유저줄(대상?.아이디 ?? '').isVisible(), false);
  });
});
