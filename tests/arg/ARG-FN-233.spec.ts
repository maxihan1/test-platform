import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지, 상점에서사기, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-233',
  name: '「행운의 반지」를 끼고 퀘스트 보상을 받으면 골드가 배율 없이 50 오른다',
  platforms: ['android'],
  precondition: ['「행운의 반지」를 낀 일반 회원이 상점 구매 퀘스트를 채웠다'],
  elements: ['item:lucky_ring', 'quest:shop_buy', 'flow:골드-퀘스트보상'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「행운의 반지」를 끼고 구매 퀘스트를 채운다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-233', [{ 이름: '행운의 반지', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-233');
      await 가방에서장착(game, '행운의 반지');
      await GM(game, '/gm quest reset');
      await 상점에서사기(game, ['조약돌']);
      await 퀘스트창.열기(game);
    });
    await test.step('퀘스트 창을 확인한다', async () => {
      await verify('퀘스트 창이 열려 있다', await 퀘스트창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('퀘스트 창에서 「보상 받기」를 누른다', async () => {
      const 퀘스트 = 퀘스트창.지금(game);
      const 전 = await 상단바골드(game);
      await 퀘스트.보상받기('상점에서 물건 구매');
      await 골드될때까지(game, 전 + 50);
      const 화면 = await verify('상단 바 골드가 50 오른다', (await 상단바골드(game)) - 전, 50);
      const 서버 = await verify('서버에 저장된 골드가 50 오른다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 + 50)).골드 - 전, 50);
      await verify('「행운의 반지」를 끼고 퀘스트 보상을 받으면 골드가 배율 없이 50 오른다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
