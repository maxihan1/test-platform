import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 봇이길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-473',
  name: '초대를 받은 뒤 다른 길드에 들어간 채 수락하면 「이미 길드에 들어가 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 일반 회원을 길드에 초대했다'],
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
    await test.step('두 번째 플레이어 봇이 길드를 만들고 일반 회원을 초대하게 한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 골드맞추기(game, 1000);
      await 봇이길드만들기(admin, 둘째, '봇길드473');
      await 봇시키기(admin, 둘째, `guild_invite:${아이디}`);
    });
    await test.step('길드 초대 창이 떴는지 확인한다', async () => {
      await verify('「길드 초대」 창이 보인다', (await 초대창.뜰때까지(game, '길드 초대')) !== null, true, { blocker: true });
    });
    await test.step('초대 창을 닫지 않은 채 내 길드를 만든 뒤 「수락」을 누른다', async () => {
      await 내가길드만들기(game, '시험길드473');
      const 창 = await 초대창.뜰때까지(game, '길드 초대');
      if (창 === null) throw new Error('길드 초대 창이 사라졌다');
      await 창.수락();
      await verify('초대를 받은 뒤 다른 길드에 들어간 채 수락하면 「이미 길드에 들어가 있습니다」가 뜬다', await 토스트떴나(game, '이미 길드에 들어가 있습니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
