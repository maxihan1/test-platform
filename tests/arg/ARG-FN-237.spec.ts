import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, GM결과기다리기, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-237',
  name: '보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원이 던전 보스 방에 와 있다'],
  elements: ['quest:kill_boss', 'state:장소=던전'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방으로 가 퀘스트를 처음으로 돌린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      if (!(await GM결과기다리기(game, '/gm tp boss', 'tp boss 도착', 20_000))) throw new Error('「[GM] tp boss 도착」 알림이 20초 안에 오지 않았다');
      await GM(game, '/gm quest reset');
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).보이나(던전화면.행동막대), true, { blocker: true });
    });
    await test.step('GM 명령으로 보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      await 로비화면.열기(game, 90_000);
      const 퀘스트 = await 퀘스트창.열기(game);
      await 조건될때까지(async () => (await 퀘스트.줄칸글('던전 보스 처치', 2)) !== '0/1');
      await verify('보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다', await 퀘스트.줄칸글('던전 보스 처치', 2), '1/1');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
