import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이친구신청해수락하기, 친구신청해봇이수락하기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-291',
  name: '친구가 있을 때 다른 캐릭터와 친구가 되면 「친구 2명」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 두 번째 플레이어와 친구이고 새 계정 봇이 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 새 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 플레이어가 친구인 상태로 두 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 봇이친구신청해수락하기(game, admin, 둘째, 아이디);
    });
    await test.step('두 번째 플레이어와 친구인지 확인한다', async () => {
      const 창 = await 친구파티창.열기(game);
      await verify('친구 목록에 두 번째 플레이어가 보인다', (await 창.줄글들()).some((줄) => 줄.includes(둘째)), true, { blocker: true });
    });
    await test.step('새 계정 캐릭터에게 친구 신청을 보내고 봇이 수락한다', async () => {
      await 친구신청해봇이수락하기(game, admin, 새);
      const 창 = await 친구파티창.다시열기(game);
      await verify('친구가 있을 때 다른 캐릭터와 친구가 되면 「친구 2명」이 보인다', (await 창.줄글들()).some((줄) => 줄.includes('친구 2명')), true);
    });
  } finally {
    await 봇시키기(admin, 새, `friend_remove:${아이디}`);
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
