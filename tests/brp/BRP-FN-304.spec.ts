import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 만든이름, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-304',
  name: '100자를 넘는 채팅이 오면 서버가 잘라 내 채팅 창에 그 글이 100자로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다'],
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

  await test.step('두 번째 플레이어 봇이 101자 전체 채팅을 보낸다', async () => {
    const 창 = await 채팅창.열기(game);
    const 긴글 = 만든이름(101);
    await 봇시키기(admin, 둘아이디, 'say:' + 긴글);
    const 줄 = await 창.줄기다리기((글) => 색글떼기(글).includes(긴글.slice(0, 20)), 5, 15_000);
    const 백자보임 = await verify('채팅 창 줄에 앞의 100자가 있다', 줄 !== null && 색글떼기(줄).includes(긴글.slice(0, 100)), true);
    const 백일자안보임 = await verify('채팅 창 줄에 101자째 글자가 없다', 줄 !== null && 색글떼기(줄).includes(긴글), false);
    await verify('100자를 넘는 채팅이 오면 서버가 잘라 내 채팅 창에 그 글이 100자로 보인다', 백자보임 && 백일자안보임, true);
  });
});
