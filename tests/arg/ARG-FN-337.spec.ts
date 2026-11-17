import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-337',
  name: '길드장이 접속 중이고 길드가 없는 캐릭터를 「초대」하면 「qa_player2 님을 길드에 초대했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드가 있고 두 번째 플레이어 봇이 접속해 있다'],
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
    await test.step('일반 회원이 길드를 만들고 두 번째 플레이어 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, '시험길드337');
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('「초대할 캐릭터 이름」 칸에 「qa_player2」를 넣고 「초대」를 누른다', async () => {
      const 창 = await 길드창.열기(game);
      await 창.초대하기(둘째);
      await verify('길드장이 접속 중이고 길드가 없는 캐릭터를 「초대」하면 「qa_player2 님을 길드에 초대했습니다」가 뜬다', await 토스트떴나(game, `${둘째} 님을 길드에 초대했습니다`), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
