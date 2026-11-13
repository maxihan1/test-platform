import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 색벗기기 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비 } from './pages/lobby.page.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-049',
  name: '로그인하면 채팅에 「[알림] <아이디> 님이 접속했습니다」가 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('접속 알림 글 — 아이디 자리는 <아이디>').default('[알림] <아이디> 님이 접속했습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('맞는 계정으로 로그인하고 채팅 창을 연다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 로비.열기(game);
    await 채팅창.열기(game);
  });

  await test.step('채팅 창의 접속 알림을 확인한다', async () => {
    const 채팅 = await 채팅창.열기(game);
    const 아이디 = (params.loginId ?? '').trim();
    const 찾음 = await 채팅.줄뜨는지(`${아이디} 님이 접속했습니다`);
    const 원문 = 찾음 ? 색벗기기((await 채팅.줄원문(`${아이디} 님이 접속했습니다`)) ?? '') : '';
    await verify('로그인하면 채팅에 「[알림] <아이디> 님이 접속했습니다」가 보인다', 원문.includes(expected.알림글.replace('<아이디>', 아이디)), true);
  });
});
