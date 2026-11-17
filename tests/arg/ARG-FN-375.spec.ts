import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-375',
  name: '레벨 5 에서 「사슬 갑옷」을 장착하면 방어율이 0.04 + 0.15 = 0.19 다',
  platforms: ['android'],
  precondition: ['레벨 5 일반 회원이 「사슬 갑옷」을 가졌다'],
  elements: ['item:chain_armor'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 장비를 준비한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-375', [{ 이름: '사슬 갑옷', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 5');
      await 우편받기(game, 'ARG-FN-375');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('「사슬 갑옷」을 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '사슬 갑옷');
      const 상태 = await 상태읽기(game);
      await verify('레벨 5 에서 「사슬 갑옷」을 장착하면 방어율이 0.04 + 0.15 = 0.19 다', Number(상태['방어율']), 0.19);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
