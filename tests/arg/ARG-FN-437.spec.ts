import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-437',
  name: '「보내기」를 누르면 「전체」 채널로 보내지고 입력 칸이 빈다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('글을 넣고 「보내기」를 누른다', async () => {
      const 창 = await 채팅창.열기(game);
      await 창.보내기('전송글');
      await 창.띠에뜰때까지('전송글');
      const 전체로 = await verify('전체 채널로 보내진다', (await 창.줄글들()).includes(`[전체] ${아이디}: 전송글`), true);
      const 비었다 = await verify('입력 칸이 빈다', await 창.입력칸글(), '');
      await verify('「보내기」를 누르면 「전체」 채널로 보내지고 입력 칸이 빈다', 전체로 && 비었다, true);
    });
    await test.step('보낸 뒤 바로 다음 글을 넣는다', async () => {
      const 창 = 채팅창.지금(game);
      await verify('보낸 뒤 입력 칸에 바로 다음 글을 넣을 수 있다', await 창.넣기('다음글'), '다음글');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
