import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-249',
  name: '파티 없이 파티 채널로 보내면 「파티에 들어가 있지 않습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 채팅 창을 열었다'],
  techniques: ['동등 분할'],
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
    await test.step('파티 없이 「파티」 탭에서 글을 보낸다', async () => {
      const 창 = await 채팅창.열기(game);
      await 창.탭누르기('파티');
      await 창.보내기('파티글');
      await verify('파티 없이 파티 채널로 보내면 「파티에 들어가 있지 않습니다」 오류 알림이 뜬다', await 토스트떴나(game, '파티에 들어가 있지 않습니다'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
