import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-188',
  name: '아이템을 장착하면 가방 목록에서 빠져 그 판매 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 낀 일반 회원이 가방 창을 열었다'],
  techniques: ['상태 전이'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 끼고 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-188', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-188');
      await 가방에서장착(game, '녹슨 단검');
      await 가방창.열기(game);
    });
    await test.step('장착 칸을 확인한다', async () => {
      await verify('무기 칸에 「녹슨 단검」이 보인다', (await 가방창.지금(game).장착칸글('무기')).includes('녹슨 단검'), true, { blocker: true });
    });
    await test.step('가방 목록의 판매 버튼을 확인한다', async () => {
      const 가방 = 가방창.지금(game);
      const 줄 = await 가방.목록.이름줄('녹슨 단검');
      const 줄없음 = await verify('가방 목록에 「녹슨 단검」 줄이 없다', 줄, null);
      const 판매없음 = await verify('「녹슨 단검」의 판매 버튼이 보이지 않는다', 줄 === null ? null : await 가방.목록.줄버튼(줄, '판매'), null);
      await verify('아이템을 장착하면 가방 목록에서 빠져 그 판매 버튼이 보이지 않는다', 줄없음 && 판매없음, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
