import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 있는지 } from './helpers/find.helper.js';
import { 던전까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-341',
  name: '던전 행동 막대 왼쪽에 「물약 <개수>」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 탱커로 던전에 들어가 있다'],
  elements: ['item:health_potion', 'class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    모양: z.string().describe('물약 버튼 글자와 자리 — 수는 <개수>로 바꿔 견준다').default('물약 <개수> · 행동 막대 왼쪽'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 탱커 던전에 들어간다', async () => {
    const 화면 = await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 화면.안내창닫기();
    await verify('던전 행동 막대가 보인다', await 있는지(game, 던전.행동막대), true, { blocker: true });
  });

  await test.step('던전 「물약」 버튼을 확인한다', async () => {
    const 화면 = await 던전.열기(game);
    await verify('던전 행동 막대 왼쪽에 「물약 <개수>」 버튼이 보인다', await 화면.물약버튼모양(), expected.모양);
  });
});
