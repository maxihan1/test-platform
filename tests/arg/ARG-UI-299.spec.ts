import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-299',
  name: '로그인 화면 비밀번호 칸에 넣은 글자가 가려져 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    입력글: z.string().describe('비밀번호 칸에 넣을 글자 — 영문과 숫자').default('abc12345'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('비밀번호 칸에 글자를 넣는다', async () => {
    await 화면.비밀번호넣기(params.입력글);
    const 표시 = await 화면.글(로그인화면.비밀번호글);
    await verify('로그인 화면 비밀번호 칸에 넣은 글자가 가려져 보인다', 표시 !== '' && !/[A-Za-z0-9]/.test(표시), true);
  });
});
