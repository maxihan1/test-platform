import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-244',
  name: '채팅 입력 칸에 101자를 넣으면 100자까지만 들어간다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 채팅 창을 열었다'],
  techniques: ['경계값 분석'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('입력 칸에 101자를 넣는다', async () => {
      const 창 = await 채팅창.열기(game);
      const 들어간글 = await 창.넣기('가'.repeat(101));
      await verify('채팅 입력 칸에 101자를 넣으면 100자까지만 들어간다', 들어간글.length, 100);
    });
    await test.step('100자 글을 넣고 「보내기」를 누른다', async () => {
      const 창 = 채팅창.지금(game);
      await 창.보내기('나'.repeat(100));
      await 창.띠에뜰때까지('나'.repeat(100));
      await verify('100자 글은 잘리지 않고 그대로 채팅 줄에 보인다', (await 창.줄원문들()).some((줄) => 줄.includes('나'.repeat(100))), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
