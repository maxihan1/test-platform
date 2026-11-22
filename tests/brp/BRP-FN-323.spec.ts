import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 다시접속하기, 소셜정리, 초대가올때까지 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-323',
  name: '친구 신청을 수락하면 내 친구 목록에 상대 이름이 들어온다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 친구 · 파티 · 길드 없이 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
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

  await test.step('두 번째 플레이어에게 친구 신청을 보내고 봇이 수락한다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.친구신청(둘아이디);
    await 초대가올때까지(admin, 둘아이디, 'friend');
    await 봇시키기(admin, 둘아이디, 'friend_accept:' + 내아이디);
    await verify('친구 신청을 수락하면 내 친구 목록에 상대 이름이 들어온다', (await 창.친구줄기다리기(둘아이디, '')) !== null, true);
  });

  await test.step('두 번째 플레이어에게 친구 신청을 보내고 봇이 수락한 뒤 게임을 껐다 켜 다시 로그인한다', async () => {
    const 다시 = await 다시접속하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 다시, true, { blocker: true });
    const 창 = await 친구파티창.열기(game);
    await verify('친구가 된 뒤 저장돼 다시 접속해도 친구 목록에 그 이름이 남아 있다', (await 창.친구줄기다리기(둘아이디, '')) !== null, true);
  });
});
