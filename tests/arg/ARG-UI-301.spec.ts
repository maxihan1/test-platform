import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-301',
  name: '비밀번호 칸에 넣은 글자는 「*」로 가려져 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    넣을글: z.string().min(1).describe('비밀번호 칸에 넣을 글자 — 1자 이상').default('abc12345'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('비밀번호 칸에 글자를 넣는다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.비밀번호넣기(params.넣을글);
    await verify('비밀번호 칸에 넣은 글자는 「*」로 가려져 보인다', /^\*+$/.test(await 화면.비밀번호글()), true);
  });
});
