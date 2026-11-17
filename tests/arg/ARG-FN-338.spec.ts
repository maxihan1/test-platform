import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이길드만들기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-338',
  name: '길드 초대를 받으면 「길드 초대」 창에 「qa_player2 님이 길드 「<길드>」에 초대했습니다」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장인 길드가 있고 일반 회원은 길드가 없다'],
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
  const 길드이름 = '봇길드338';
  try {
    await test.step('두 번째 플레이어 봇이 길드를 만든다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, 길드이름);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 일반 회원을 길드에 초대한다', async () => {
      await 봇시키기(admin, 둘째, `guild_invite:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '길드 초대');
      await verify('길드 초대를 받으면 「길드 초대」 창에 「qa_player2 님이 길드 「<길드>」에 초대했습니다」가 보인다', 창 === null ? '' : await 창.본문(), `${둘째} 님이 길드 「${길드이름}」에 초대했습니다`);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
