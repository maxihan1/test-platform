import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 친구맺기, 친구창다시열기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇끄기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-331',
  name: '친구 · 파티 창 친구 목록 차례를 읽으면 친구 목록은 접속 중인 친구가 위에 온다',
  platforms: ['windows'],
  precondition: ['일반 회원이 두 번째 · 세 번째 플레이어와 친구이고 세 번째 플레이어만 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 셋아이디 = params.p3Id ?? '';
  const 셋비밀번호 = params.p3Password ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('두 번째 · 세 번째 플레이어와 친구가 되고 두 번째 플레이어만 접속을 끊은 것을 확인한다', async () => {
    const 창 = await 친구파티창.열기(game);
    await verify('두 번째 플레이어와 친구다', await 친구맺기(admin, 창, 둘아이디, 내아이디, 1), true, { blocker: true });
    await verify('세 번째 플레이어와 친구다', await 친구맺기(admin, 창, 셋아이디, 내아이디, 2), true, { blocker: true });
    await 봇끄기(admin, 둘아이디);
    const 새창 = await 친구창다시열기(game);
    await verify('두 번째 플레이어 친구 줄이 오프라인이다', (await 새창.친구줄기다리기(둘아이디, '오프라인')) !== null, true, { blocker: true });
  });

  await test.step('친구 · 파티 창 친구 목록 차례를 읽는다', async () => {
    const 창 = await 친구파티창.열기(game);
    const 줄들 = await 창.줄들();
    const 셋번호 = 창.친구줄번호(줄들, 셋아이디);
    const 둘번호 = 창.친구줄번호(줄들, 둘아이디);
    await verify('친구 · 파티 창 친구 목록 차례를 읽으면 친구 목록은 접속 중인 친구가 위에 온다', 셋번호 >= 0 && 둘번호 >= 0 && 셋번호 < 둘번호, true);
  });
});
