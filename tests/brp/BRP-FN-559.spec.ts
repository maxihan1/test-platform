import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-559',
  name: '채팅을 보내면 입력 칸이 빈다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    채팅글: z.string().min(1).max(30).describe('보낼 채팅 글 — 공백이 아닌 30자 이하').default('QA 채팅 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 채팅글 = params.채팅글;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('채팅을 보낸 뒤 입력 칸을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.보내기(채팅글);
    await 창.줄기다리기((글) => 색글떼기(글).includes(채팅글), 5, 10_000);
    await verify('채팅을 보내면 입력 칸이 빈다', await 창.입력칸글(), '');
  });

  await test.step('채팅을 보낸 뒤 입력 칸에 바로 글자를 넣는다', async () => {
    const 창 = await 채팅창.열기(game);
    await verify('채팅을 보낸 뒤 다시 누르지 않아도 입력 칸에 바로 글자가 들어간다', await 창.입력칸포커스(), true);
  });
});
