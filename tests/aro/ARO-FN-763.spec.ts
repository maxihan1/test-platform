import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인돼있는가, 빈지급이력모킹걸기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-763',
  name: '보낸 지급이 없으면 「아직 보낸 지급이 없습니다」가 보인다',
  precondition: ['지급 이력 응답은 빈 목록 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  let 모킹풀기 = async (): Promise<void> => {};

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      모킹풀기 = await 빈지급이력모킹걸기(page);
      await 화면.열기();
      await verify('보낸 지급이 없으면 「아직 보낸 지급이 없습니다」가 보인다', await 화면.빈이력안내.isVisible(), true);
    });
  } finally {
    await 모킹풀기();
  }
});
