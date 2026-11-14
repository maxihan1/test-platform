import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-509',
  name: '맞는 것이 없는 낱말로 검색하면 「결과가 없습니다.」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    없는낱말: z.string().min(1).describe('맞는 계정 · 태그 · 글이 없는 낱말').default('tczzqxwvy없음'),
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

  await test.step('검색칸에 아무것도 맞지 않는 낱말을 넣고 Enter 를 친다', async () => {
    await 검색.찾기(params.없는낱말);
    await 검색.결과제목.filter({ hasText: params.없는낱말 }).waitFor();
    await 검색.결과기다리기();
    await verify('맞는 것이 없는 낱말로 검색하면 「결과가 없습니다.」가 보인다', await 검색.결과없음뿐인가(), true);
  });
});
