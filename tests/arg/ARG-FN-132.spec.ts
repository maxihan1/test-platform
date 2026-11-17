import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 경험치글이바뀔때까지, 골드가바뀔때까지, 임프하나만두기 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-132',
  name: '임프를 처치하면 따로 알림 없이 상단 바의 골드가 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['flow:골드-임프처치', 'monster:imp'],
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
    let 골드전 = 0;
    let 경험치전 = '';
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
      골드전 = Number((await new 공통HUD(game).골드글()).replace(/[^0-9]/g, ''));
      경험치전 = await new 공통HUD(game).경험치글();
    });

    await test.step('GM 명령으로 임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      await verify('임프를 처치하면 따로 알림 없이 상단 바의 골드가 바뀐다', (await 골드가바뀔때까지(game, 골드전)) !== 골드전, true);
      await verify('상단 바의 경험치가 바뀐다', (await 경험치글이바뀔때까지(game, 경험치전)) !== 경험치전, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
