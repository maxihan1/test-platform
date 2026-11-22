import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 만든이름, 봇이받은글, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-302',
  name: '앞뒤 공백을 자르면 100자인 채팅을 보내면 상대가 받은 글이 공백 없는 100자다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다', '일반 회원으로 로그인해 로비에 있다'],
  techniques: ['경계값 분석'],
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

  await test.step('앞뒤에 공백을 붙인 100자 채팅을 보내고 봇 기록을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    const 백자 = 만든이름(100);
    await 창.보내기(' ' + 백자 + ' ');
    const 받은글 = await 봇이받은글(admin, 둘아이디, 백자.slice(0, 20));
    await verify('앞뒤 공백을 자르면 100자인 채팅을 보내면 상대가 받은 글이 공백 없는 100자다', 받은글, 백자);
  });

  await test.step('채팅 입력 칸에 101자를 넣는다', async () => {
    const 창 = await 채팅창.열기(game);
    const 넣은글 = await 창.넣기(만든이름(101));
    await verify('채팅 입력 칸에 101자를 넣은 뒤 100자까지만 들어간다', 넣은글.length, 100);
  });
});
