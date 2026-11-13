import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드없음확인 } from './helpers/social-state.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-243',
  name: '길드 없이 길드 탭에서 보내면 「길드에 들어가 있지 않습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['길드가 없고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: z.object({
    알림글: z.string().describe('길드 없이 보낼 때 알림 문구').default('길드에 들어가 있지 않습니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어가 길드가 없는지 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드 창에 「만들기 · 500G」 버튼이 보인다', await 길드없음확인(game), true, { blocker: true });
  });

  await test.step('채팅 창 「길드」 탭에서 글을 넣고 「보내기」를 누른다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭누르기('길드');
    await 창.보내기하기(params.보낼글);
    await verify('길드 없이 길드 탭에서 보내면 「길드에 들어가 있지 않습니다」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
