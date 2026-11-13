import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-300',
  name: '로그인 화면에 창 제목 「로그인」, 안내 글 「아이디」 · 「비밀번호」, 「게임 시작」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: z.object({
    화면글: z.string().describe('창 제목 · 안내 글 · 버튼 글').default('로그인 · 아이디 · 비밀번호 · 게임 시작'),
  }),
});

test(spec, async ({ game, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('로그인 화면을 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 글들 = [await 화면.제목글(), await 화면.아이디안내글(), await 화면.비밀번호안내글(), await 화면.게임시작글()];
    await verify('로그인 화면에 창 제목 「로그인」, 안내 글 「아이디」 · 「비밀번호」, 「게임 시작」 버튼이 보인다', 글들.join(' · '), expected.화면글);
  });
});
