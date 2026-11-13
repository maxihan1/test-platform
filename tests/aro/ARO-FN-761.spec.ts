import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-761',
  name: '캐릭터가 51명 넘게 맞으면 후보는 50개까지 뜬다',
  techniques: ['경계값 분석'],
  held: '보류 — 캐릭터 51명이 없다',
  precondition: ['캐릭터가 51명 넘게 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    모두에든글자: z.string().min(1).describe('검색어 — 캐릭터 51명 넘게 이름에 들어 있는 글자'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
  });

  await test.step('「지급 · 회수」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
  });

  await test.step('받는 캐릭터 칸에 모두에 든 글자를 적는다', async () => {
    await 화면.검색어적기(params.모두에든글자);
    await 화면.후보뜰때까지();
    await verify('캐릭터가 51명 넘게 맞으면 후보는 50개까지 뜬다', await 화면.후보들.count(), 50);
  });
});
