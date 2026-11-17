import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기, 봇이볼때까지, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-310',
  name: '「파티 나가기」를 누르면 나에게 「파티를 떠났습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇과 새 계정 봇이 같은 파티다'],
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
    await test.step('일반 회원이 두 번째 플레이어 봇과 새 계정 봇을 파티로 불러들인다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
      await 내가봇을파티에초대해수락시키기(game, admin, 새);
    });
    await test.step('파티가 3명인지 확인한다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('파티 머리줄에 「파티 3/4」가 보인다', (await 창.줄글들()).some((줄) => 줄.includes('파티 3/4')), true, { blocker: true });
    });
    await test.step('친구 · 파티 창의 「파티 나가기」를 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.누르기(친구파티창.파티나가기);
      await verify('「파티 나가기」를 누르면 나에게 「파티를 떠났습니다」가 뜬다', await 토스트떴나(game, '파티를 떠났습니다'), true);
      await verify('남은 봇에게 「qa_player1 님이 파티를 떠났습니다」가 간다', await 봇이볼때까지(admin, 둘째, `${아이디} 님이 파티를 떠났습니다`), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
