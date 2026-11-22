import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-311',
  name: '길드 없이 길드 채널로 보내면 오류 알림 「길드에 들어가 있지 않습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  techniques: ['동등 분할'],
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

  await test.step('길드 없이 「길드」 탭에서 글을 보낸다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('길드');
    await 창.보내기(채팅글);
    await verify('길드 없이 길드 채널로 보내면 오류 알림 「길드에 들어가 있지 않습니다」가 뜬다', (await 알림글(game, '길드에 들어가 있지 않습니다')) !== null, true);
  });
});
