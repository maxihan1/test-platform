import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 머리위숫자글, 수치, 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-103',
  name: '레벨 5 탱커가 「강철 롱소드」를 끼고 「전투 망치」로 치면 준 피해가 12 다',
  platforms: ['android'],
  precondition: ['레벨 5 일반 회원이 「강철 롱소드」를 끼고 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['item:steel_longsword', 'skill:war_hammer'],
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
    let 장착글 = '';
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 「강철 롱소드」을 받아 낀다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      장착글 = await 장비받아끼기(game, admin, 아이디, '강철 롱소드', '무기');
    });
    await test.step('무기 칸을 확인한다', async () => {
      await verify('무기 칸에 「강철 롱소드」가 보인다', 장착글.includes('강철 롱소드'), true, { blocker: true });
    });

    await test.step('던전에서 탱커로 임프 하나를 불러내 레벨을 5 로 바꾼다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두고레벨맞추기(game, 5);
    });

    await test.step('「전투 망치」로 임프를 친다', async () => {
      await 던전화면.지금(game).누르기(던전화면.임프);
      await 머리위숫자글(game, 던전화면.적피해숫자);
      const 상태 = await 상태읽기(game, true);
      await verify('레벨 5 탱커가 「강철 롱소드」를 끼고 「전투 망치」로 치면 준 피해가 12 다', 수치(상태, '준피해'), 12);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
