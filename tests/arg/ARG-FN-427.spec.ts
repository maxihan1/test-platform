import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 전체채팅보내기 } from './helpers/social-state.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-427',
  name: '「보내기」를 누르면 입력 칸이 빈다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 입력 칸에 글을 넣고 「보내기」를 누른다', async () => {
    const 창 = await 채팅창.열기(game);
    await 전체채팅보내기(창, params.보낼글);
    await verify('「보내기」를 누르면 입력 칸이 빈다', await 창.입력칸비었는지(), true);
  });
});
