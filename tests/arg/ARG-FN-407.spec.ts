import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 던전에들어갈때까지 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-407',
  name: '접속한 모두가 준비하면 3초 뒤 던전으로 넘어간다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원이 혼자 로비에 있다'],
  elements: ['move:장소 로비→던전'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 혼자 로비에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    const 로비 = 로비화면.지금(game);
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('영웅 카드를 골라 「준비!」를 누른다', async () => {
      await 로비.카드누르기(로비화면.카드차례.탱커);
      const 시작 = Date.now();
      await 로비.준비누르기();
      const 넘어갔다 = await 던전에들어갈때까지(game, 60_000);
      const 걸린시간 = Date.now() - 시작;
      const 던전에옴 = await verify('던전으로 넘어간다', 넘어갔다, true);
      const 삼초뒤 = await verify('「준비!」를 누른 지 3초가 지나서 넘어간다', 걸린시간 >= 3_000, true);
      await verify('접속한 모두가 준비하면 3초 뒤 던전으로 넘어간다', 던전에옴 && 삼초뒤, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
