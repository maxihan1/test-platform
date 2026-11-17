import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 머리위숫자글, 수치, 임프하나만두고레벨맞추기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-102',
  name: '레벨 1 탱커가 버프 없이 「전투 망치」로 임프를 치면 준 피해가 10 이다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['skill:war_hammer', 'monster:imp'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러내 레벨을 1 로 맞춘다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두고레벨맞추기(game, 1);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('버프 없이 「전투 망치」로 임프를 친다', async () => {
      await 던전화면.지금(game).누르기(던전화면.임프);
      await 머리위숫자글(game, 던전화면.적피해숫자);
      const 상태 = await 상태읽기(game, true);
      await verify('레벨 1 탱커가 버프 없이 「전투 망치」로 임프를 치면 준 피해가 10 이다', 수치(상태, '준피해'), 10);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
