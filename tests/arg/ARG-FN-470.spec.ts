import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-470',
  name: '접속 중이 아닌 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드가 있고 새 계정 캐릭터는 접속해 있지 않다'],
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
    await test.step('일반 회원이 길드를 만들고 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, '시험길드470');
      await 길드창.열기(game);
    });
    await test.step('길드 창이 열렸는지 확인한다', async () => {
      await verify('길드 창이 열려 있다', await 길드창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('접속하지 않은 이름으로 「초대」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.초대하기(새);
      await verify('접속 중이 아닌 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다', await 토스트떴나(game, '접속 중인 캐릭터만 초대할 수 있습니다'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
