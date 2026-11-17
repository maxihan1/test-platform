import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 골드될때까지, 상점에서사기, 가방에서장착 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-379',
  name: '장비 없이는 경험치 배율이 1 이고 「현자의 목걸이」를 장착하면 1.2 다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:sage_necklace'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 장비를 준비한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm gold 300');
      await 골드될때까지(game, 300);
      await 상점에서사기(game, ['현자의 목걸이']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('「현자의 목걸이」를 장착하기 전과 뒤의 능력치를 읽는다', async () => {
      const 전상태 = await 상태읽기(game);
      const 전 = await verify('장비 없이는 경험치 배율이 1 이다', Number(전상태['경험치배율']), 1);
      await 가방에서장착(game, '현자의 목걸이');
      const 후상태 = await 상태읽기(game);
      const 후 = await verify('경험치 배율이 1.2 다', Number(후상태['경험치배율']), 1.2);
      await verify('장비 없이는 경험치 배율이 1 이고 「현자의 목걸이」를 장착하면 1.2 다', 전 && 후, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
