import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 수치, 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-117',
  name: '레벨 1 에서 장비 · 파티 없이 임프를 처치하면 경험치가 12 오른다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다', '「현자의 목걸이」를 낀 일반 회원이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['monster:imp', 'item:sage_necklace'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러내 레벨을 1 로 맞춘다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두고레벨맞추기(game, 1);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('GM 명령으로 임프를 처치하고 경험치를 읽는다', async () => {
      await GM(game, '/gm killall');
      const 상태 = await 상태읽기(game, true);
      await verify('레벨 1 에서 장비 · 파티 없이 임프를 처치하면 경험치가 12 오른다', 수치(상태, '경험치'), 12);
    });

    await test.step('던전에서 「현자의 목걸이」를 받아 끼고 임프 하나를 다시 불러내 레벨을 1 로 맞춘다', async () => {
      장착글 = await 장비받아끼기(game, admin, 아이디, '현자의 목걸이', '장신구');
      await 임프하나만두고레벨맞추기(game, 1);
    });
    await test.step('장신구 칸을 확인한다', async () => {
      await verify('장신구 칸에 「현자의 목걸이」가 보인다', 장착글.includes('현자의 목걸이'), true, { blocker: true });
    });

    await test.step('GM 명령으로 임프를 처치하고 경험치를 다시 읽는다', async () => {
      await GM(game, '/gm killall');
      const 상태 = await 상태읽기(game, true);
      await verify('「현자의 목걸이」를 낀 채 처치한 경험치는 12 × 1.2 를 반올림한 14 다', 수치(상태, '경험치'), 14);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
