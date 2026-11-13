import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 전체채팅보내기 } from './helpers/social-state.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-238',
  name: '전체 탭에서 글을 보내면 채팅에 「[전체] <이름>: <글>」 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: z.object({
    말머리: z.string().describe('전체 탭 줄 머리말').default('[전체]'),
  }),
  smoke: true,
});

test(spec, async ({ game, params, expected }) => {
  let 이름 = '';

  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    이름 = await 대기실.hud.캐릭터이름();
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('전체 탭에서 글을 넣고 「보내기」를 누른다', async () => {
    const 창 = await 채팅창.열기(game);
    await 전체채팅보내기(창, params.보낼글);
    const 줄들 = await 창.줄글들();
    await verify('전체 탭에서 글을 보내면 채팅에 「[전체] <이름>: <글>」 줄이 보인다', 줄들.includes(`${expected.말머리} ${이름}: ${params.보낼글}`), true);
  });
});
