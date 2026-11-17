import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 화면자리 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-336',
  name: '던전 왼쪽 위 초상화에 내 이름과 체력 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 로비화면.카드차례.탱커);
    });
    const 던전 = 던전화면.지금(game);
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전.보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('던전 왼쪽 위 초상화를 확인한다', async () => {
      const 이름 = await verify('초상화에 내 이름이 보인다', await 던전.글(던전화면.내이름), 아이디);
      const 막대 = await verify('초상화에 체력 막대가 보인다', await 던전.보이나(던전화면.내체력막대), true);
      const 자리 = await 화면자리(game, 던전화면.내초상화);
      const 왼쪽 = await verify('초상화가 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
      const 위 = await verify('초상화가 화면 위쪽에 있다', 자리.세로 < 0.5, true);
      await verify('던전 왼쪽 위 초상화에 내 이름과 체력 막대가 보인다', 이름 && 막대 && 왼쪽 && 위, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
