import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-757',
  name: '대문자 검색어 「QA_PLAYER2」로 찾으면 검색이 끝나고 「총 N명」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    대문자검색어: z.string().min(1).describe('검색어 — 영문 대문자로 적은 글').default('QA_PLAYER2'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」 화면을 열어 유저 표를 확인한다', async () => {
    await 화면.열기();
    await verify('유저 표가 보인다', await 화면.유저표.isVisible(), true, { blocker: true });
  });

  await test.step('유저 검색 칸에 대문자 「QA_PLAYER2」를 적는다', async () => {
    await 화면.검색(params.대문자검색어);
    const 보임 = await verify('「총 N명」이 보인다', await 화면.총인원.isVisible(), true);
    const 꼴 = await verify('합계 글이 「총 N명」 꼴이다', /^총 [\d,]+명$/.test((await 화면.총인원.innerText()).trim()), true);
    await verify('대문자 검색어 「QA_PLAYER2」로 찾으면 검색이 끝나고 「총 N명」이 보인다', 보임 && 꼴, true);
  });
});
