import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 봇이길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-329',
  name: '이미 있는 길드와 이름이 똑같으면 「이미 있는 길드 이름입니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 만든 길드가 있고 일반 회원이 길드 창을 열었다'],
  techniques: ['동등 분할'],
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
  const 길드이름 = '봇길드329';
  try {
    await test.step('두 번째 플레이어 봇이 길드를 만들고 일반 회원이 골드 1000 으로 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, 길드이름);
      await 골드맞추기(game, 1000);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('봇 길드와 똑같은 이름으로 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기(길드이름);
      await verify('이미 있는 길드와 이름이 똑같으면 「이미 있는 길드 이름입니다」가 뜬다', await 토스트떴나(game, '이미 있는 길드 이름입니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
