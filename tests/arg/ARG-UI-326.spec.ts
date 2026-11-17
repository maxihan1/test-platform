import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점에서사기, 색이름, 바탕색읽기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-326',
  name: '목표를 채우고 보상을 안 받은 퀘스트 줄이 옅은 금색 바탕으로 보인다',
  platforms: ['android'],
  precondition: ['상점 구매 퀘스트를 채우고 보상을 안 받은 일반 회원으로 로비에 있다'],
  elements: ['quest:shop_buy'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 구매 퀘스트를 채운다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
      await 상점에서사기(game, ['조약돌']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('퀘스트 창을 연다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      const 줄 = (await 퀘스트.목록.이름줄('상점에서 물건 구매')) ?? '';
      await verify('목표를 채우고 보상을 안 받은 퀘스트 줄이 옅은 금색 바탕으로 보인다', 색이름(await 바탕색읽기(game, 줄)), '금색');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
