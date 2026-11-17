import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이길드만들기, 봇이나를길드에초대해수락하기, 봇이다른봇을초대해수락시키기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-342',
  name: '길드장이 탈퇴하면 가장 먼저 들어온 내가 길드장이 되어 「[길드장]」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장이고 일반 회원이 먼저, 새 계정 봇이 나중에 들어왔다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 새 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('두 번째 플레이어 봇이 길드장이 되고 일반 회원이 먼저, 새 계정 봇이 나중에 들어온다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 봇이길드만들기(admin, 둘째, '봇길드342');
      await 봇이나를길드에초대해수락하기(game, admin, 둘째, 아이디);
      await 봇이다른봇을초대해수락시키기(admin, 'guild', 둘째, 새);
    });
    await test.step('길드에 들어왔는지 확인한다', async () => {
      const 창 = await 길드창.열기(game);
      await verify('길드 창에 길드원 줄이 보인다', (await 창.머리글()).includes('길드원 3명'), true, { blocker: true });
    });
    await test.step('길드장 봇이 「길드 탈퇴」를 한다', async () => {
      await 봇시키기(admin, 둘째, 'guild_leave');
      await 토스트떴나(game, `${둘째} 님이 길드를 떠났습니다`);
      const 창 = await 길드창.다시열기(game);
      await verify('길드장이 탈퇴하면 가장 먼저 들어온 내가 길드장이 되어 「[길드장]」이 보인다', (await 창.줄글들()).some((줄) => 줄.includes('[길드장]') && 줄.includes(아이디)), true);
    });
  } finally {
    await 봇시키기(admin, 새, 'guild_leave');
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
