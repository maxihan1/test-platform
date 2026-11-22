import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 채팅줄꼴인가 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-306',
  name: '전체 채팅을 보내고 채팅 창 줄을 읽으면 전체 채팅 줄은 「[전체]」 뒤에 보낸 사람 이름과 「:」 · 글이 이어진 꼴이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다', '일반 회원으로 로그인해 로비에 있다'],
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

  await test.step('전체 채팅을 보내고 채팅 창 줄을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('전체');
    await 창.보내기(채팅글);
    const 줄 = await 창.줄기다리기((글) => 색글떼기(글).includes(채팅글), 5, 10_000);
    await verify('전체 채팅을 보내고 채팅 창 줄을 읽으면 전체 채팅 줄은 「[전체]」 뒤에 보낸 사람 이름과 「:」 · 글이 이어진 꼴이다', 줄 !== null && 채팅줄꼴인가(줄, '전체', 내아이디, 채팅글), true);
  });

  await test.step('두 번째 플레이어 봇을 켜고 채팅 창 시스템 줄을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    const 알림줄 = await 창.줄기다리기((글) => 색글떼기(글).includes('님이 접속했습니다'), 30, 15_000);
    await verify('시스템 줄은 「[알림]」으로 시작한다', 알림줄 !== null && 색글떼기(알림줄).startsWith('[알림]'), true);
  });
});
