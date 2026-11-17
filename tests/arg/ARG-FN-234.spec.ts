import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 상점에서사기 } from './helpers/economy.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-234',
  name: '보상을 받은 뒤 퀘스트 창을 열면 그 퀘스트에 「보상 받기」가 없어 다시 받을 수 없다',
  platforms: ['android'],
  precondition: ['상점 구매 퀘스트 보상을 이미 받은 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 구매 퀘스트 보상을 받고 로그인한 채로 둔다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm quest reset');
      await 상점에서사기(game, ['조약돌']);
      const 퀘스트 = await 퀘스트창.열기(game);
      await 퀘스트.보상받기('상점에서 물건 구매');
      await 조건될때까지(async () => (await 퀘스트.줄칸글('상점에서 물건 구매', 3)) === '받음');
      await 퀘스트.닫기누르기();
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('퀘스트 창에서 구매 퀘스트 줄을 확인한다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      const 받음 = await verify('구매 퀘스트 줄에 「받음」이 보인다', await 퀘스트.줄칸글('상점에서 물건 구매', 3), '받음');
      const 줄 = await 퀘스트.목록.이름줄('상점에서 물건 구매');
      const 버튼 = 줄 === null ? '줄 없음' : await 퀘스트.목록.줄버튼(줄, '보상 받기');
      const 없음 = await verify('「보상 받기」가 없다', 버튼, null);
      await verify('보상을 받은 뒤 퀘스트 창을 열면 그 퀘스트에 「보상 받기」가 없어 다시 받을 수 없다', 받음 && 없음, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
