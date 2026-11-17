import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-300',
  name: '이름 칸이 비었을 때 「친구 신청」 · 「파티 초대」를 누르면 아무 알림도 뜨지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 친구 · 파티 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 친구 · 파티 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 친구파티창.열기(game);
    });
    await test.step('친구 · 파티 창이 열렸는지 확인한다', async () => {
      await verify('친구 · 파티 창이 열려 있다', await 친구파티창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('이름 칸을 비운 채 「친구 신청」과 「파티 초대」를 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.누르기(친구파티창.친구신청);
      await 창.누르기(친구파티창.파티초대);
      await 창.친구신청하기(아이디);
      await 토스트떴나(game, '자신에게는 신청할 수 없습니다');
      const 알림들 = await new 공통HUD(game).알림글들();
      await verify('이름 칸이 비었을 때 「친구 신청」 · 「파티 초대」를 누르면 아무 알림도 뜨지 않는다', 알림들.filter((글) => !글.includes('자신에게는 신청할 수 없습니다')), []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
