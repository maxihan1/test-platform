import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나만두기 } from './helpers/battle.helper.js';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 골드될때까지, 상점에서사기, 가방에서장착 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-229',
  name: '장비를 끼고 임프 1마리를 처치하면 「임프 30마리 처치」 진행은 1 만 오른다',
  platforms: ['android'],
  precondition: ['「현자의 목걸이」를 낀 일반 회원이 던전에서 임프 하나를 불러냈다'],
  elements: ['item:sage_necklace', 'quest:kill_imps'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「현자의 목걸이」를 끼고 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm gold 300');
      await 골드될때까지(game, 300);
      await 상점에서사기(game, ['현자의 목걸이']);
      await 가방에서장착(game, '현자의 목걸이');
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
      await verify('장비를 끼고 임프 1마리를 처치하면 「임프 30마리 처치」 진행은 1 만 오른다', await 퀘스트.줄칸글('임프 30마리 처치', 2), '1/30');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
