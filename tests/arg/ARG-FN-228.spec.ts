import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점에서사기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-228',
  name: '구매 퀘스트 목표 1 을 넘게 사면 진행이 「1/1」에서 더 오르지 않는다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원으로 로비에 있다'],
  elements: ['quest:shop_buy', 'flow:골드-상점구매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 퀘스트를 처음으로 돌린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('상점에서 「조약돌」을 두 번 산다', async () => {
      await 상점에서사기(game, ['조약돌', '조약돌']);
      const 퀘스트 = await 퀘스트창.열기(game);
      await verify('구매 퀘스트 목표 1 을 넘게 사면 진행이 「1/1」에서 더 오르지 않는다', await 퀘스트.줄칸글('상점에서 물건 구매', 2), '1/1');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
