import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이친구신청해수락하기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-460',
  name: '이미 친구인 캐릭터에게 친구 신청을 하면 「이미 친구입니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어가 친구이고 일반 회원이 친구 · 파티 창을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 플레이어를 친구로 만들고 친구 · 파티 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이친구신청해수락하기(game, admin, 둘째, 아이디);
      await 친구파티창.다시열기(game);
    });
    await test.step('두 번째 플레이어와 친구인지 확인한다', async () => {
      await verify('친구 목록에 두 번째 플레이어가 보인다', (await 친구파티창.지금(game).줄글들()).some((줄) => 줄.includes(둘째)), true, { blocker: true });
    });
    await test.step('이미 친구인 이름으로 「친구 신청」을 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.친구신청하기(둘째);
      await verify('이미 친구인 캐릭터에게 친구 신청을 하면 「이미 친구입니다」가 뜬다', await 토스트떴나(game, '이미 친구입니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
