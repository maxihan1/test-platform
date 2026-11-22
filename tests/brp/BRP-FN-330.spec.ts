import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 소셜정리, 안뜨는지지켜보기, 알림이비기를기다리기, 친구맺기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-330',
  name: '친구 줄의 「삭제」를 누르면 친구 삭제는 확인 창 없이 바로 지운다',
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

  await test.step('알림이 모두 사라진 것을 확인한다', async () => {
    await verify('알림이 모두 사라졌다', await 알림이비기를기다리기(game), true, { blocker: true });
  });

  await test.step('친구 줄의 「삭제」를 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    const 번호 = 창.친구줄번호(await 창.줄들(), 둘아이디);
    await 창.줄버튼누르기(번호, '삭제');
    await verify('친구 줄의 「삭제」를 누르면 친구 삭제는 확인 창 없이 바로 지운다', await 창.친구줄사라질때까지(둘아이디), true);
    await verify('친구를 삭제해도 알림이 뜨지 않는다', await 안뜨는지지켜보기(async () => (await new 알림띠(game).글들()).length > 0, 2_000), true);
  });
});
