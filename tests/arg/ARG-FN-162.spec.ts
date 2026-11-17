import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-162',
  name: '알 수 없는 아이템을 가방에서 보면 그 줄에 「장착」 버튼이 없다',
  platforms: ['android'],
  precondition: ['「QA 수상한 돌」을 가진 일반 회원이 가방 창을 열었다'],
  techniques: ['상태 전이'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「QA 수상한 돌」을 받아 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-162', [{ 이름: 'QA 수상한 돌', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-162');
      await 가방창.열기(game);
    });
    await test.step('가방에 「QA 수상한 돌」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「QA 수상한 돌」 줄이 있다', (await 가방창.지금(game).목록.이름줄('QA 수상한 돌')) !== null, true, { blocker: true });
    });
    await test.step('「QA 수상한 돌」 줄을 확인한다', async () => {
      const 가방 = 가방창.지금(game);
      const 줄 = await 가방.목록.이름줄('QA 수상한 돌');
      const 장착 = 줄 === null ? '줄 없음' : await 가방.목록.줄버튼(줄, '장착');
      await verify('알 수 없는 아이템을 가방에서 보면 그 줄에 「장착」 버튼이 없다', 장착, null);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
