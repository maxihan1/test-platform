import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 임프하나만두기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-075',
  name: '「공격」 버튼을 누르면 탱커의 첫 번째 스킬 「전투 망치」를 쓴다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['class:tank', 'skill:war_hammer'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      const 화면 = 던전화면.지금(game);
      await verify('던전에 「공격」 버튼이 보인다', await 화면.보이나(던전화면.공격), true, { blocker: true });
      await verify('던전에 임프가 보인다', await 화면.보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('임프를 고르고 「공격」 버튼을 누른다', async () => {
      const 화면 = 던전화면.지금(game);
      await 화면.누르기(던전화면.임프);
      await 화면.누르기(던전화면.공격);
      const 상태 = await 상태읽기(game, true);
      await verify('「공격」 버튼을 누르면 탱커의 첫 번째 스킬 「전투 망치」를 쓴다', 상태['쓴스킬'], '전투 망치');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
