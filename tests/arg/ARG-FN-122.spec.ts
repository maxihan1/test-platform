import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드가바뀔때까지, 임프하나만두기 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-122',
  name: '장비 없이 임프를 처치하면 골드가 3 이상 7 이하로 오른다',
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
    let 처음골드 = 0;
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
      처음골드 = Number((await new 공통HUD(game).골드글()).replace(/[^0-9]/g, ''));
    });

    await test.step('GM 명령으로 임프를 처치하고 골드를 읽는다', async () => {
      await GM(game, '/gm killall');
      const 나중골드 = await 골드가바뀔때까지(game, 처음골드);
      const 오른골드 = 나중골드 - 처음골드;
      await verify('장비 없이 임프를 처치하면 골드가 3 이상 7 이하로 오른다', 오른골드 >= 3 && 오른골드 <= 7, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
