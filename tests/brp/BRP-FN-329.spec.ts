import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇오류알림기다리기, 봇오류알림수, 소셜정리, 친구맺기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-329',
  name: '친구 줄의 「삭제」를 누르면 내 친구 목록에서 그 줄이 빠진다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어가 친구다'],
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

  await test.step('일반 회원과 두 번째 플레이어가 친구가 된 것을 확인한다', async () => {
    const 창 = await 친구파티창.열기(game);
    await verify('두 번째 플레이어와 친구다', await 친구맺기(admin, 창, 둘아이디, 내아이디, 1), true, { blocker: true });
  });

  await test.step('친구 줄의 「삭제」를 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    const 번호 = 창.친구줄번호(await 창.줄들(), 둘아이디);
    await 창.줄버튼누르기(번호, '삭제');
    await verify('친구 줄의 「삭제」를 누르면 내 친구 목록에서 그 줄이 빠진다', await 창.친구줄사라질때까지(둘아이디), true);
  });

  await test.step('친구 줄의 「삭제」를 누르고 봇이 친구를 다시 지우게 해 봇 기록을 읽는다', async () => {
    const 전 = await 봇오류알림수(admin, 둘아이디);
    await 봇시키기(admin, 둘아이디, 'friend_remove:' + 내아이디);
    await verify('친구를 삭제한 뒤 상대 목록에서도 빠져 상대가 지우려 할 때 이미 친구가 아니다', await 봇오류알림기다리기(admin, 둘아이디, 전 + 1), true);
  });
});
