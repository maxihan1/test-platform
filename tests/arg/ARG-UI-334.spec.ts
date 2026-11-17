import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-334',
  name: '「파티」 탭을 누르면 그 탭이 밝게, 나머지 탭이 어둡게 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 채팅 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 채팅 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 채팅창.열기(game);
    });
    await test.step('채팅 창이 열렸는지 확인한다', async () => {
      await verify('채팅 창에 입력 칸이 보인다', await 채팅창.지금(game).보이나(채팅창.입력칸), true, { blocker: true });
    });
    await test.step('「파티」 탭을 누른다', async () => {
      const 창 = 채팅창.지금(game);
      await 창.탭누르기('파티');
      const 파티밝기 = await 창.탭밝기('파티');
      await verify('「파티」 탭을 누르면 그 탭이 밝게, 나머지 탭이 어둡게 보인다', 파티밝기 > (await 창.탭밝기('전체')) && 파티밝기 > (await 창.탭밝기('길드')), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
