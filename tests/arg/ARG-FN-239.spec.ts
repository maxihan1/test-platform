import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점에서사기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-239',
  name: '상점에서 구매에 성공하면 「상점에서 물건 구매」 진행이 「0/1」에서 「1/1」로 오른다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원이 로비에서 상점 창을 열었다'],
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
  let 시작맞음 = false;
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 퀘스트를 처음으로 돌리고 퀘스트 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
      await 퀘스트창.열기(game);
    });
    await test.step('퀘스트 진행을 확인한다', async () => {
      시작맞음 = await verify('「상점에서 물건 구매」 진행이 「0/1」이다', await 퀘스트창.지금(game).줄칸글('상점에서 물건 구매', 2), '0/1', { blocker: true });
    });
    await test.step('「조약돌」 「구매」를 누르고 퀘스트 창을 연다', async () => {
      await 퀘스트창.지금(game).닫기누르기();
      await 상점에서사기(game, ['조약돌']);
      const 퀘스트 = await 퀘스트창.열기(game);
      const 후 = await verify('구매 뒤 진행이 「1/1」이다', await 퀘스트.줄칸글('상점에서 물건 구매', 2), '1/1');
      await verify('상점에서 구매에 성공하면 「상점에서 물건 구매」 진행이 「0/1」에서 「1/1」로 오른다', 시작맞음 && 후, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
