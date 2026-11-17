import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-320',
  name: '「녹슨 단검」 줄에는 「장착」과 판매가 20 인 「판매」가 보이고 「사용」은 없다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」과 「체력 물약」을 가진 일반 회원으로 로비에 있다'],
  elements: ['item:rusty_dagger', 'item:health_potion'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 받는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-320', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-UI-320');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 장착 = await verify('「녹슨 단검」 줄에 「장착」이 보인다', (await 가방.줄버튼글('녹슨 단검', '장착')) !== null, true);
      const 판매 = await verify('「녹슨 단검」 줄의 「판매」에 판매가 20 이 보인다', await 가방.줄버튼글('녹슨 단검', '판매'), '판매 20G');
      const 사용 = await verify('「녹슨 단검」 줄에 「사용」이 없다', await 가방.줄버튼글('녹슨 단검', '사용'), null);
      await verify('「녹슨 단검」 줄에는 「장착」과 판매가 20 인 「판매」가 보이고 「사용」은 없다', 장착 && 판매 && 사용, true);
    });
    await test.step('가방 창의 「체력 물약」 줄을 확인한다', async () => {
      const 가방 = 가방창.지금(game);
      const 사용 = await verify('「체력 물약」 줄에 「사용」이 보인다', (await 가방.줄버튼글('체력 물약', '사용')) !== null, true);
      const 판매 = await verify('「체력 물약」 줄의 「판매」에 판매가 7 이 보인다', await 가방.줄버튼글('체력 물약', '판매'), '판매 7G');
      const 장착 = await verify('「체력 물약」 줄에 「장착」이 없다', await 가방.줄버튼글('체력 물약', '장착'), null);
      await verify('「체력 물약」 줄에는 「사용」과 판매가 7 인 「판매」가 보이고 「장착」은 없다', 사용 && 판매 && 장착, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
