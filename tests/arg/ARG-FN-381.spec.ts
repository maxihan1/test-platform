import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 알림없어질때까지, 상점에서사기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-381',
  name: '상점 구매 퀘스트 보상을 받으면 골드 50 · 경험치 50 만 오르고 가방에 전리품이 늘지 않는다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원이 상점 구매 퀘스트를 채웠다'],
  elements: ['quest:shop_buy', 'flow:골드-퀘스트보상'],
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
      await 알림없어질때까지(game);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('퀘스트 창에서 「보상 받기」를 누르고 가방을 연다', async () => {
      const 전 = await 상태읽기(game);
      const 전가방창 = await 가방창.열기(game);
      const 전가방 = (await 전가방창.목록.첫칸들()).join(' / ');
      await 전가방창.닫기누르기();
      const 퀘스트 = await 퀘스트창.열기(game);
      await 퀘스트.보상받기('상점에서 물건 구매');
      await 조건될때까지(async () => (await 퀘스트.줄칸글('상점에서 물건 구매', 3)) === '받음');
      await 퀘스트.닫기누르기();
      const 후 = await 상태읽기(game);
      const 가방 = await 가방창.열기(game);
      const 골드 = await verify('골드가 50 오른다', Number(후['골드']) - Number(전['골드']), 50);
      const 경험 = await verify('경험치가 50 오른다', Number(후['경험치']) - Number(전['경험치']), 50);
      const 그대로 = await verify('가방에 전리품이 늘지 않는다', (await 가방.목록.첫칸들()).join(' / '), 전가방);
      await verify('상점 구매 퀘스트 보상을 받으면 골드 50 · 경험치 50 만 오르고 가방에 전리품이 늘지 않는다', 골드 && 경험 && 그대로, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
