import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-461',
  name: '접속 중이 아닌 캐릭터에게 친구 신청을 하면 「접속 중인 캐릭터에게만 신청할 수 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 친구 · 파티 창을 열었고 새 계정 캐릭터는 접속해 있지 않다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 새 = params.newId ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 친구 · 파티 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 친구파티창.열기(game);
    });
    await test.step('친구 · 파티 창이 열렸는지 확인한다', async () => {
      await verify('친구 · 파티 창이 열려 있다', await 친구파티창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('접속하지 않은 캐릭터 이름으로 「친구 신청」을 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.친구신청하기(새);
      await verify('접속 중이 아닌 캐릭터에게 친구 신청을 하면 「접속 중인 캐릭터에게만 신청할 수 있습니다」가 뜬다', await 토스트떴나(game, '접속 중인 캐릭터에게만 신청할 수 있습니다'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
