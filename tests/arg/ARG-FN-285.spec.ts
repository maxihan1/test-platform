import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-285',
  name: '친구 신청을 받으면 「친구 신청」 창에 「qa_player2 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 일반 회원에게 친구 신청을 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '친구 신청');
      const 본문 = await verify('「qa_player2 님이 친구 신청을 했습니다」가 보인다', 창 === null ? '' : await 창.본문(), `${둘째} 님이 친구 신청을 했습니다`);
      const 수락 = await verify('「수락」이 보인다', 창 !== null && (await 창.수락보이나()), true);
      const 거절 = await verify('「거절」이 보인다', 창 !== null && (await 창.거절보이나()), true);
      await verify('친구 신청을 받으면 「친구 신청」 창에 「qa_player2 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다', 본문 && 수락 && 거절, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
