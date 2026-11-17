import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 보스방으로 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-131',
  name: '보스를 잡으면 「보스 처치! 보스의 왕관 조각 획득」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['전리품을 「보스의 왕관 조각」으로 고정한 일반 회원이 던전 보스 방에 와 있다'],
  elements: ['item:boss_crown_shard', 'drop:boss'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방에서 전리품을 「보스의 왕관 조각」으로 고정한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
      await GM(game, '/gm loot 보스의 왕관 조각');
    });
    await test.step('던전을 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      const 큰글 = await game.waitFor(던전화면.보스처치큰글, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      const 색 = 큰글 ? await game.get(던전화면.보스처치큰글, 'TextMeshProUGUI.color') : null;
      const 금색 = Array.isArray(색) && Number(색[0]) > 0.8 && Number(색[1]) > 0.6 && Number(색[2]) < 0.6;
      await verify('화면 가운데에 큰 금색 「보스 처치!」가 뜬다', 큰글 && 금색, true);
      await verify('보스를 잡으면 「보스 처치! 보스의 왕관 조각 획득」 알림이 뜬다', await new 공통HUD(game).알림기다리기('보스 처치! 보스의 왕관 조각 획득'), true);
    });
  } finally {
    await GM(game, '/gm loot off');
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
