import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 알림글읽기 } from './helpers/economy.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-230',
  name: '구매 퀘스트 목표를 채우면 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 퀘스트를 처음으로 돌린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('상점에서 「조약돌」을 산다', async () => {
      const 상점 = await 상점창.열기(game);
      await 상점.끌어올리기();
      await 상점.구매('조약돌');
      const 글 = await 알림글읽기(game, '퀘스트 완료:');
      await verify('구매 퀘스트 목표를 채우면 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다', 글, '퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
