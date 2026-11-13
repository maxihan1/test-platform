import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-189',
  name: '숫자가 아닌 검색어 「2a」로 찾으면 계정 번호 2 인 qa_player2 가 보이지 않는다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    섞은검색어: z.string().min(1).describe('검색어 — 숫자 뒤에 글자가 붙어 qa_player2 의 번호 · 아이디와 맞지 않는 글').default('2a'),
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
    await verify('qa_player2 줄이 보인다', await 화면.유저줄(시험계정).isVisible(), true, { blocker: true });
  });

  await test.step('유저 검색 칸에 「2a」를 적는다', async () => {
    await 화면.검색(params.섞은검색어);
    await verify('숫자가 아닌 검색어 「2a」로 찾으면 계정 번호 2 인 qa_player2 가 보이지 않는다', await 화면.유저줄(시험계정).isVisible(), false);
  });
});
