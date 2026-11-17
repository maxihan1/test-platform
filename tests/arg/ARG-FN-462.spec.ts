import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇시켜서친구지우기, 봇이친구신청해수락하기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-462',
  name: '이미 친구이면서 접속 중이 아닌 캐릭터에게 신청하면 앞 차례인 「이미 친구입니다」 하나만 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 접속하지 않은 새 계정과 친구이고 친구 · 파티 창을 열었다'],
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
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('일반 회원이 새 계정과 친구인 상태에서 새 계정 봇을 끄고 친구 · 파티 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 봇이친구신청해수락하기(game, admin, 새, 아이디);
      await 봇끄기(admin, 새);
      await 친구파티창.다시열기(game);
    });
    await test.step('친구 · 파티 창이 열렸는지 확인한다', async () => {
      await verify('친구 · 파티 창이 열려 있다', await 친구파티창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('접속하지 않은 친구 이름으로 「친구 신청」을 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.친구신청하기(새);
      const 이미친구 = await verify('「이미 친구입니다」가 뜬다', await 토스트떴나(game, '이미 친구입니다'), true);
      const 뒤차례없음 = await verify('「접속 중인 캐릭터에게만 신청할 수 있습니다」는 뜨지 않는다', await 토스트떴나(game, '접속 중인 캐릭터에게만 신청할 수 있습니다', 3_000), false);
      await verify('이미 친구이면서 접속 중이 아닌 캐릭터에게 신청하면 앞 차례인 「이미 친구입니다」 하나만 뜬다', 이미친구 && 뒤차례없음, true);
    });
  } finally {
    await 봇시켜서친구지우기(admin, 새, 새비밀번호, 아이디);
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
