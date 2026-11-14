import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정목록 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-196',
  name: '유저 검색 칸을 비우면 「총 N명」이 전체 계정 수와 같다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」 화면에서 검색어를 적어 둔다', async () => {
    await 화면.열기(`?q=${시험계정}`);
    await verify('유저 검색 칸에 검색어가 들어 있다', await 화면.검색칸.inputValue(), 시험계정, { blocker: true });
  });

  await test.step('유저 검색 칸을 비운다', async () => {
    await 화면.검색('');
    const 전체 = (await 계정목록(page)).total;
    await verify('유저 검색 칸을 비우면 「총 N명」이 전체 계정 수와 같다', await 화면.총인원.innerText(), `총 ${전체.toLocaleString('ko-KR')}명`);
  });
});
