import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새로접속 } from './helpers/social-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-566',
  name: '공백만 넣고 「보내기」를 누르면 채팅 줄이 늘지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공백: z.string().min(1).describe('채팅 입력 칸에 넣을 글 — 공백 글자만').default('   '),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 새로접속(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 입력 칸에 공백만 넣고 「보내기」를 누른다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.첫줄뜨는지();
    await 창.탭누르기('전체');
    const 앞줄수 = await 창.줄수();
    await 창.글넣기(params.공백);
    await 창.보내기누르기();
    await 창.새줄이뜨는지(앞줄수, '[전체]', 3_000);
    await verify('공백만 넣고 「보내기」를 누르면 채팅 줄이 늘지 않는다', await 창.줄수(), 앞줄수);
  });
});
