import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이받은빈줄수, 봇줄기다리기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-305',
  name: '채팅 입력 칸에 공백만 넣고 「보내기」를 누르면 공백뿐인 채팅은 보내지지 않아 상대 봇 기록에 그 줄이 없다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    채팅글: z.string().min(1).max(30).describe('보낼 채팅 글 — 공백이 아닌 30자 이하').default('QA 채팅 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 채팅글 = params.채팅글;
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

  await test.step('채팅 입력 칸에 공백만 넣고 「보내기」를 누른다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.보내기('   ');
    await 창.보내기(채팅글);
    await 봇줄기다리기(admin, 둘아이디, 'chat', 채팅글);
    await verify('채팅 입력 칸에 공백만 넣고 「보내기」를 누르면 공백뿐인 채팅은 보내지지 않아 상대 봇 기록에 그 줄이 없다', await 봇이받은빈줄수(admin, 둘아이디), 0);
  });
});
