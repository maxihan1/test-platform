import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 지급회수 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-212',
  name: '운영툴에서 첨부를 회수하면 우편함에서 사라져 그 우편에 「받기」가 없다',
  platforms: ['android'],
  precondition: ['「체력 물약」을 첨부한 우편을 운영툴에서 회수했다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 보냈다가 회수하고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      const 지급번호 = await 우편넣기(admin, 아이디, 'ARG-FN-212 회수', [{ 이름: '체력 물약', 개수: 1 }]);
      await 지급회수(admin, 지급번호);
      await 우편넣기(admin, 아이디, 'ARG-FN-212 확인용');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-FN-212 확인용');
      const 줄 = await 창.목록.이름줄(우편제목('ARG-FN-212 회수'));
      const 받기 = 줄 === null ? null : await 창.목록.줄버튼(줄, '받기');
      await verify('운영툴에서 첨부를 회수하면 우편함에서 사라져 그 우편에 「받기」가 없다', 받기, null);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
