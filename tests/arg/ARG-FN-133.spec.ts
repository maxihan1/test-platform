import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나만두기, 처치수가오를때까지 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-133',
  name: '임프를 처치하면 처치 수가 1 오르고 보스 처치 수는 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['monster:imp'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
    });
    let 처음: Record<string, string> = {};
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
      처음 = await 상태읽기(game, true);
    });

    await test.step('GM 명령으로 임프를 처치하고 처치 수를 읽는다', async () => {
      await GM(game, '/gm killall');
      const 나중 = await 처치수가오를때까지(game, Number(처음['처치']));
      const 처치 = await verify('처치 수가 1 오른다', Number(나중['처치']) - Number(처음['처치']), 1);
      const 보스 = await verify('보스 처치 수가 그대로다', Number(나중['보스처치']), Number(처음['보스처치']));
      await verify('임프를 처치하면 처치 수가 1 오르고 보스 처치 수는 그대로다', 처치 && 보스, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
