import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-325',
  name: '일일 퀘스트 창에 제목 「일일 퀘스트」와 퀘스트 3줄이 이름 · 「보상 <골드> 골드 · <경험치> 경험치」 · 「0/<목표>」와 함께 보인다',
  platforms: ['android'],
  precondition: ['일일 퀘스트를 처음으로 돌린 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 퀘스트를 처음으로 돌린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('퀘스트 창을 연다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      const 제목 = await verify('창 제목이 「일일 퀘스트」이다', await 퀘스트.글(퀘스트창.제목), '일일 퀘스트');
      const 줄0 = await verify('「임프 30마리 처치」 줄에 이름 · 보상 · 진행이 보인다', /^임프 30마리 처치 · 보상 \d+ 골드 · \d+ 경험치 · 0\/\d+$/.test(await 퀘스트.줄전체글('임프 30마리 처치')), true);
      const 줄1 = await verify('「던전 보스 처치」 줄에 이름 · 보상 · 진행이 보인다', /^던전 보스 처치 · 보상 \d+ 골드 · \d+ 경험치 · 0\/\d+$/.test(await 퀘스트.줄전체글('던전 보스 처치')), true);
      const 줄2 = await verify('「상점에서 물건 구매」 줄에 이름 · 보상 · 진행이 보인다', /^상점에서 물건 구매 · 보상 \d+ 골드 · \d+ 경험치 · 0\/\d+$/.test(await 퀘스트.줄전체글('상점에서 물건 구매')), true);
      await verify('일일 퀘스트 창에 제목 「일일 퀘스트」와 퀘스트 3줄이 이름 · 「보상 <골드> 골드 · <경험치> 경험치」 · 「0/<목표>」와 함께 보인다', 제목 && 줄0 && 줄1 && 줄2, true);
      const 배치 = await game.layout(퀘스트창.창);
      await verify('퀘스트 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
