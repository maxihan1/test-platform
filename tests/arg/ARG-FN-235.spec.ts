import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나만두기 } from './helpers/battle.helper.js';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-235',
  name: '임프가 죽으면 「임프 30마리 처치」 진행이 「1/30」이 된다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원이 던전에서 임프 하나를 불러냈다'],
  elements: ['quest:kill_imps'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러내 퀘스트를 처음으로 돌린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
      await GM(game, '/gm quest reset');
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).보이나(던전화면.행동막대), true, { blocker: true });
    });
    await test.step('GM 명령으로 임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      await game.waitFor(던전화면.임프, { gone: true, timeoutMs: 10_000 });
      const 퀘스트 = await 퀘스트창.열기(game);
      await 조건될때까지(async () => (await 퀘스트.줄칸글('임프 30마리 처치', 2)) !== '0/30');
      await verify('임프가 죽으면 「임프 30마리 처치」 진행이 「1/30」이 된다', await 퀘스트.줄칸글('임프 30마리 처치', 2), '1/30');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
