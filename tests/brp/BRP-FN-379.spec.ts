import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드세우기, 소셜정리, 알림글, 초대가올때까지 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-379',
  name: '길드 초대를 수락하면 길드원이 되고 「님이 길드에 들어왔습니다」 알림이 그 이름과 함께 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있고 두 번째 플레이어 봇이 길드 없이 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어를 초대하고 봇이 수락한다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.초대하기(둘아이디);
    await 초대가올때까지(admin, 둘아이디, 'guild');
    await 봇시키기(admin, 둘아이디, 'guild_accept:' + 내아이디);
    const 알림 = await 알림글(game, '님이 길드에 들어왔습니다');
    const 조각보임 = await verify('「님이 길드에 들어왔습니다」 알림이 보인다', 알림 !== null, true);
    const 이름보임 = await verify('알림에 상대 이름이 있다', 알림 !== null && 알림.includes(둘아이디), true);
    await verify('길드 초대를 수락하면 길드원이 되고 「님이 길드에 들어왔습니다」 알림이 그 이름과 함께 뜬다', 조각보임 && 이름보임, true);
  });
});
