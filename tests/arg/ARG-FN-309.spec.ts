import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-309',
  name: '새 파티 초대가 오면 앞의 초대는 사라져 수락하면 나중에 초대한 사람의 파티에 들어간다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 손님 봇이 접속해 있다'],
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
  let 손님 = '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 두 번째 플레이어 봇과 손님 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      손님 = await 봇켜기(admin, { bot: 'qaguest1' });
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('두 봇이 차례로 일반 회원을 초대한 뒤 남은 초대를 수락한다', async () => {
      await 봇시키기(admin, 둘째, `party_invite:${아이디}`);
      const 첫초대 = await 초대창.뜰때까지(game, '파티 초대');
      await 첫초대?.본문에글이뜰때까지(둘째);
      await 봇시키기(admin, 손님, `party_invite:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '파티 초대');
      await 창?.본문에글이뜰때까지(손님);
      await 창?.수락();
      await 토스트떴나(game, `${아이디} 님이 파티에 들어왔습니다`);
      const 새창 = await 친구파티창.다시열기(game);
      const 줄들 = await 새창.줄글들();
      const 나중 = await verify('나중에 초대한 사람이 파티에 있다', 줄들.some((줄) => 줄.includes(손님)), true);
      const 먼저 = await verify('먼저 초대한 사람은 파티에 없다', 줄들.some((줄) => 줄.includes(둘째)), false);
      await verify('새 파티 초대가 오면 앞의 초대는 사라져 수락하면 나중에 초대한 사람의 파티에 들어간다', 나중 && 먼저, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
