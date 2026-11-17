import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 봇이길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-471',
  name: '이미 길드에 있는 캐릭터를 초대하면 「qa_player2 님은 이미 길드에 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드가 있고 두 번째 플레이어 봇은 다른 길드에 있다'],
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
    await test.step('일반 회원이 길드를 만들고 두 번째 플레이어 봇이 다른 길드에 있게 한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, '봇길드471');
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, '시험길드471');
      await 길드창.열기(game);
    });
    await test.step('길드 창이 열렸는지 확인한다', async () => {
      await verify('길드 창이 열려 있다', await 길드창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('봇 이름으로 「초대」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.초대하기(둘째);
      await verify('이미 길드에 있는 캐릭터를 초대하면 「qa_player2 님은 이미 길드에 있습니다」가 뜬다', await 토스트떴나(game, `${둘째} 님은 이미 길드에 있습니다`), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
