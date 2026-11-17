import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 보스방으로 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-093',
  name: '보스 임프가 죽으면 7초 뒤 결과 화면에 「승리!」가 보인다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 던전 보스 방에 와 있다'],
  elements: ['zone:Dungeon', 'monster:imp_boss'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방으로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
    });
    await test.step('던전에 있는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      const 떴다 = await game.waitFor(결과화면.승리글자, { timeoutMs: 30_000 }).then(
        () => true,
        () => false,
      );
      await verify('보스 임프가 죽으면 7초 뒤 결과 화면에 「승리!」가 보인다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
