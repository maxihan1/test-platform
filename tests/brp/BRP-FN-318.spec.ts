import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 알림글, 초대가올때까지, 초대수 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-318',
  name: '이름을 정확히 넣고 「친구 신청」을 누르면 상대 봇 기록에 친구 신청 초대가 온다',
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

  await test.step('친구 · 파티 창 「캐릭터 이름」 칸에 두 번째 플레이어 이름을 정확히 넣고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.친구신청(둘아이디);
    await verify('이름을 정확히 넣고 「친구 신청」을 누르면 상대 봇 기록에 친구 신청 초대가 온다', await 초대가올때까지(admin, 둘아이디, 'friend'), true);
  });

  await test.step('「캐릭터 이름」 칸에 두 번째 플레이어 이름을 대문자로 바꿔 넣고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    const 전 = await 초대수(admin, 둘아이디, 'friend');
    await 창.친구신청(둘아이디.toUpperCase());
    const 알림뜸 = await verify('「그런 이름의 캐릭터가 없습니다」 알림이 보인다', (await 알림글(game, '그런 이름의 캐릭터가 없습니다')) !== null, true);
    const 안감 = await verify('친구 신청 초대가 늘지 않는다', await 초대수(admin, 둘아이디, 'friend'), 전);
    await verify('이름의 대소문자가 다를 때 친구 신청이 가지 않고 「그런 이름의 캐릭터가 없습니다」가 뜬다', 알림뜸 && 안감, true);
  });
});
