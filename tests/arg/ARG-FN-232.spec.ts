import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 알림없어질때까지, 알림글읽기, 상점에서사기, 색이름, 글자색읽기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-232',
  name: '보상을 받으면 「보상 받음 +50 골드 · +50 경험치」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['상점 구매 퀘스트를 채운 일반 회원이 퀘스트 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 구매 퀘스트를 채우고 퀘스트 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
      await 상점에서사기(game, ['조약돌']);
      await 알림없어질때까지(game);
      await 퀘스트창.열기(game);
    });
    await test.step('퀘스트 창을 확인한다', async () => {
      await verify('퀘스트 창이 열려 있다', await 퀘스트창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「보상 받기」를 누른다', async () => {
      const 퀘스트 = 퀘스트창.지금(game);
      await 퀘스트.보상받기('상점에서 물건 구매');
      const 글 = await 알림글읽기(game, '보상 받음');
      await verify('보상을 받으면 「보상 받음 +50 골드 · +50 경험치」 알림이 뜬다', 글, '보상 받음 +50 골드 · +50 경험치');
      await 조건될때까지(async () => (await 퀘스트.줄칸글('상점에서 물건 구매', 3)) === '받음');
      const 글자 = await verify('버튼 자리에 「받음」이 보인다', await 퀘스트.줄칸글('상점에서 물건 구매', 3), '받음');
      const 초록 = await verify('「받음」이 초록색이다', 색이름(await 글자색읽기(game, await 퀘스트.칸주소('상점에서 물건 구매', 3))), '초록');
      await verify('버튼 자리에 초록 「받음」이 보인다', 글자 && 초록, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
