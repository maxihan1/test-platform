import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-143',
  name: '무기 칸에 장비가 있을 때 다른 무기를 장착하면 무기 칸이 바뀌고 빠진 「녹슨 단검」이 가방 목록에 돌아온다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 낀 일반 회원이 「강철 롱소드」를 가방에 갖고 있다'],
  elements: ['item:rusty_dagger', 'item:steel_longsword'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 끼고 「강철 롱소드」를 가방에 둔다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-143', [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '강철 롱소드', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-143');
      await 가방에서장착(game, '녹슨 단검');
      await 가방창.열기(game);
    });
    await test.step('가방에 「강철 롱소드」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「강철 롱소드」 줄이 있다', (await 가방창.지금(game).목록.이름줄('강철 롱소드')) !== null, true, { blocker: true });
    });
    await test.step('「강철 롱소드」 줄의 「장착」을 누른다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.장착('강철 롱소드');
      await 조건될때까지(async () => (await 가방.장착칸글('무기')).includes('강철 롱소드'));
      await 조건될때까지(async () => (await 가방.목록.이름줄('녹슨 단검')) !== null);
      const 바뀜 = await verify('무기 칸이 「강철 롱소드」로 바뀐다', (await 가방.장착칸글('무기')).includes('강철 롱소드'), true);
      const 돌아옴 = await verify('빠진 「녹슨 단검」이 가방 목록에 돌아온다', (await 가방.목록.이름줄('녹슨 단검')) !== null, true);
      await verify('무기 칸에 장비가 있을 때 다른 무기를 장착하면 무기 칸이 바뀌고 빠진 「녹슨 단검」이 가방 목록에 돌아온다', 바뀜 && 돌아옴, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
