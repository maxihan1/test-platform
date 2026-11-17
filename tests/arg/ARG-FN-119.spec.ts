import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 경험치글이바뀔때까지 } from './helpers/battle.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-119',
  name: '「현자의 목걸이」를 끼고 퀘스트 보상을 받으면 경험치가 보정 없이 50 오른다',
  platforms: ['android'],
  precondition: ['「현자의 목걸이」를 낀 일반 회원이 상점 구매 퀘스트를 채웠다'],
  elements: ['item:sage_necklace', 'quest:shop_buy'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 경험치 = (글: string): number => Number(글.split('/')[0]);
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 상점에서 「현자의 목걸이」를 사 가방에서 낀다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
      await GM(game, '/gm gold 1000');
      const 상점 = await 상점창.열기(game);
      await 상점.구매('현자의 목걸이');
      await 상점.닫기누르기();
      const 가방 = await 가방창.열기(game);
      await 가방.장착('현자의 목걸이');
    });
    let 처음글 = '';
    await test.step('장신구 칸과 경험치 막대를 확인한다', async () => {
      const 가방 = 가방창.지금(game);
      await verify('장신구 칸에 「현자의 목걸이」가 보인다', (await 가방.장착칸글('장신구')).includes('현자의 목걸이'), true, { blocker: true });
      await 가방.닫기누르기();
      처음글 = await new 공통HUD(game).경험치글();
    });

    await test.step('퀘스트 창에서 「상점에서 물건 구매」 보상을 받는다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      await 퀘스트.보상받기('상점에서 물건 구매');
      await 퀘스트.닫기누르기();
      const 나중글 = await 경험치글이바뀔때까지(game, 처음글);
      await verify('「현자의 목걸이」를 끼고 퀘스트 보상을 받으면 경험치가 보정 없이 50 오른다', 경험치(나중글) - 경험치(처음글), 50);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
