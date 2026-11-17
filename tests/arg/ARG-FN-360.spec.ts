import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-360',
  name: '일일 퀘스트 창을 열면 목표와 보상이 퀘스트 표의 「임프 30마리 처치」 30 · 150 골드 · 200 경험치, 「던전 보스 처치」 1 · 300 · 400, 「상점에서 물건 구매」 1 · 50 · 50 과 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['quest:kill_imps', 'quest:kill_boss', 'quest:shop_buy'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('일일 퀘스트 창의 세 줄을 읽는다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      const 목표0 = await verify('「임프 30마리 처치」 목표가 30 이다', (await 퀘스트.줄칸글('임프 30마리 처치', 2)).split('/')[1], '30');
      const 보상0 = await verify('「임프 30마리 처치」 보상이 「보상 150 골드 · 200 경험치」이다', await 퀘스트.줄칸글('임프 30마리 처치', 1), '보상 150 골드 · 200 경험치');
      const 목표1 = await verify('「던전 보스 처치」 목표가 1 이다', (await 퀘스트.줄칸글('던전 보스 처치', 2)).split('/')[1], '1');
      const 보상1 = await verify('「던전 보스 처치」 보상이 「보상 300 골드 · 400 경험치」이다', await 퀘스트.줄칸글('던전 보스 처치', 1), '보상 300 골드 · 400 경험치');
      const 목표2 = await verify('「상점에서 물건 구매」 목표가 1 이다', (await 퀘스트.줄칸글('상점에서 물건 구매', 2)).split('/')[1], '1');
      const 보상2 = await verify('「상점에서 물건 구매」 보상이 「보상 50 골드 · 50 경험치」이다', await 퀘스트.줄칸글('상점에서 물건 구매', 1), '보상 50 골드 · 50 경험치');
      await verify('일일 퀘스트 창을 열면 목표와 보상이 퀘스트 표의 「임프 30마리 처치」 30 · 150 골드 · 200 경험치, 「던전 보스 처치」 1 · 300 · 400, 「상점에서 물건 구매」 1 · 50 · 50 과 같다', 목표0 && 보상0 && 목표1 && 보상1 && 목표2 && 보상2, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
