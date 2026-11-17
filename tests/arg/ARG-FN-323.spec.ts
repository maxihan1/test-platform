import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-323',
  name: '골드가 500 보다 적을 때 「만들기 · 500G」를 누르면 길드가 생기지 않고 골드가 499 그대로다',
  platforms: ['android'],
  precondition: ['골드가 499 인 일반 회원이 길드 없이 길드 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 499 로 맞춘 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 499);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 499 이다', await 상단바골드(game), 499, { blocker: true });
    });
    await test.step('길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('시험길드323');
      await 토스트떴나(game, '길드를 만들려면 500 골드가 필요합니다');
      const 새창 = await 길드창.다시열기(game);
      const 안생김 = await verify('길드가 생기지 않는다', (await 새창.글(길드창.안내)).includes('아직 길드가 없습니다'), true);
      const 골드 = await verify('골드가 499 그대로다', await 상단바골드(game), 499);
      await verify('골드가 500 보다 적을 때 「만들기 · 500G」를 누르면 길드가 생기지 않고 골드가 499 그대로다', 안생김 && 골드, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
