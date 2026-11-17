import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드가될때까지, 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-332',
  name: '골드가 499 면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다',
  platforms: ['android'],
  precondition: ['골드가 499 인 일반 회원이 길드 없이 길드 창을 열었다', '골드가 500 인 일반 회원이 길드 없이 길드 창을 열었다'],
  techniques: ['경계값 분석'],
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
      await 창.만들기('시험길드332');
      await verify('골드가 499 면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다', await 토스트떴나(game, '길드를 만들려면 500 골드가 필요합니다'), true);
    });
    await test.step('골드가 500 일 때 「만들기 · 500G」를 누른다', async () => {
      await 길드창.지금(game).닫기누르기();
      await 골드맞추기(game, 500);
      const 창 = await 길드창.열기(game);
      await 창.만들기('시험길드332');
      const 창설 = await verify('길드가 만들어진다', await 토스트떴나(game, '길드 창설 완료'), true);
      const 영 = await verify('골드가 0 이 된다', await 골드가될때까지(game, 0), 0);
      await verify('골드가 500 일 때는 길드가 만들어지고 골드가 0 이 된다', 창설 && 영, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
