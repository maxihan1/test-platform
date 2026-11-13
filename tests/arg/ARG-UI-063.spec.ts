import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 있는지 } from './helpers/find.helper.js';
import { 던전까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-063',
  name: '던전에서 「감정」을 누르면 감정 표현 막대가 열린다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 탱커로 던전에 들어가 있다'],
  elements: ['class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 탱커 던전에 들어간다', async () => {
    const 화면 = await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 화면.안내창닫기();
    await verify('던전 행동 막대가 보인다', await 있는지(game, 던전.행동막대), true, { blocker: true });
  });

  await test.step('행동 막대의 「감정」을 누른다', async () => {
    const 화면 = await 던전.열기(game);
    await 화면.행동막대가채워질때까지();
    await 화면.감정누르기();
    await verify('던전에서 「감정」을 누르면 감정 표현 막대가 열린다', await 화면.감정막대가뜨는지(), true);
  });

  await test.step('감정 표현 막대가 열린 채 「감정」을 다시 누른다', async () => {
    const 화면 = await 던전.열기(game);
    await 화면.감정누르기();
    await verify('「감정」을 다시 누르면 감정 표현 막대가 닫힌다', await 화면.감정막대가사라지는지(), true);
  });
});
