import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-302',
  name: '파티가 3명일 때 초대해 수락하면 4명이 되어 「파티 4/4」가 보인다',
  held: '보류 — 네 번째 캐릭터가 없다(테스트 계정은 셋이고 손님 봇은 「접속 중인 캐릭터만 초대할 수 있습니다」로 초대가 거절된다)',
  platforms: ['android'],
  precondition: ['일반 회원 파티에 봇 둘이 들어와 3명이고 손님 봇 하나가 더 접속해 있다', '일반 회원 파티가 4명이고 손님 봇 하나가 더 접속해 있다'],
  techniques: ['경계값 분석'],
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
  let 손님 = '';
  let 손님2 = '';
  try {
    await test.step('일반 회원 파티에 두 번째 플레이어와 새 계정 봇이 들어오고 손님 봇 둘이 접속한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      손님 = await 봇켜기(admin, { bot: 'qaguest1' });
      손님2 = await 봇켜기(admin, { bot: 'qaguest2' });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
      await 내가봇을파티에초대해수락시키기(game, admin, 새);
    });
    await test.step('파티가 3명인지 확인한다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('파티 머리줄에 「파티 3/4」가 보인다', (await 창.줄글들()).some((줄) => 줄.includes('파티 3/4')), true, { blocker: true });
    });
    await test.step('손님 봇을 파티에 초대하고 봇이 수락한다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.파티초대하기(손님);
      await 토스트떴나(game, `${손님} 님을 파티에 초대했습니다`);
      await 봇시키기(admin, 손님, 'party_accept');
      await 토스트떴나(game, `${손님} 님이 파티에 들어왔습니다`);
      const 새창 = await 친구파티창.다시열기(game);
      await verify('파티가 3명일 때 초대해 수락하면 4명이 되어 「파티 4/4」가 보인다', (await 새창.줄글들()).some((줄) => 줄.includes('파티 4/4')), true);
    });
    await test.step('다섯 번째 사람을 파티에 초대한다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.파티초대하기(손님2);
      await verify('파티가 4명인 채로는 초대할 때 「파티는 최대 4명입니다」가 뜬다', await 토스트떴나(game, '파티는 최대 4명입니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
