import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-333',
  name: '골드가 500 미만인 100 일 때 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다',
  platforms: ['android'],
  precondition: ['골드가 100 인 일반 회원이 길드 없이 길드 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 100 으로 맞춘 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 100);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 100 이다', await 상단바골드(game), 100, { blocker: true });
    });
    await test.step('골드가 100 일 때 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('시험길드333');
      await verify('골드가 500 미만인 100 일 때 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다', await 토스트떴나(game, '길드를 만들려면 500 골드가 필요합니다'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
