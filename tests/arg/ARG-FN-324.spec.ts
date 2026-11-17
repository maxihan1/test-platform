import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-324',
  name: '앞뒤에 공백을 붙인 이름으로 만들면 공백을 자른 이름으로 길드가 생긴다',
  platforms: ['android'],
  precondition: ['골드 1000 을 가진 일반 회원이 길드 없이 길드 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 1000 으로 맞춘 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('앞뒤에 공백을 붙인 이름으로 길드를 만든다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('   공백길드   ');
      await 토스트떴나(game, '길드 창설 완료');
      const 새창 = await 길드창.다시열기(game);
      await verify('앞뒤에 공백을 붙인 이름으로 만들면 공백을 자른 이름으로 길드가 생긴다', (await 새창.머리글()).includes('「공백길드」'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
