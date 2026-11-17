import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 실패걸기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-335',
  name: '길드 저장에 실패하면 「길드를 만들지 못했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['골드 1000 을 가진 일반 회원이 길드 창을 열었고 다음 길드 만들기 저장이 실패하도록 걸어 두었다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 1000 으로 맞춘 뒤 다음 길드 저장이 실패하게 건다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 길드창.열기(game);
      await 실패걸기(admin, '/api/saveplayercharacter');
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('시험길드335');
      await verify('길드 저장에 실패하면 「길드를 만들지 못했습니다」가 뜬다', await 토스트떴나(game, '길드를 만들지 못했습니다'), true);
      await verify('골드는 1000 그대로다', await 상단바골드(game), 1000);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
