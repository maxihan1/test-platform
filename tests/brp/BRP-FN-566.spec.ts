import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 친구맺기, 친구창다시열기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇끄기, 봇켜기, 접속상태, 캐릭터값넣기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-566',
  name: '봇 레벨을 운영 데이터로 바꾸고 1분 넘게 친구 줄을 기다리면 접속하지 않은 친구의 레벨은 1분 안팎(80초 안)마다 갱신돼 친구 줄 「Lv.」가 바뀐 값으로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어가 친구이고 봇이 꺼져 있다'],
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

  await test.step('두 번째 플레이어가 접속을 끊은 것을 확인한다', async () => {
    await 봇끄기(admin, 둘아이디);
    const 창 = await 친구창다시열기(game);
    await verify('두 번째 플레이어 친구 줄이 오프라인이다', (await 창.친구줄기다리기(둘아이디, '오프라인')) !== null, true, { blocker: true });
  });

  await test.step('봇 레벨을 운영 데이터로 바꾸고 1분 넘게 친구 줄을 기다린다', async () => {
    await 캐릭터값넣기(admin, 둘아이디, 둘비밀번호, { level: 9 });
    const 창 = await 친구파티창.열기(game);
    await verify('봇 레벨을 운영 데이터로 바꾸고 1분 넘게 친구 줄을 기다리면 접속하지 않은 친구의 레벨은 1분 안팎(80초 안)마다 갱신돼 친구 줄 「Lv.」가 바뀐 값으로 보인다', (await 창.친구줄기다리기(둘아이디, 'Lv.9', 80_000)) !== null, true);
  });
});
