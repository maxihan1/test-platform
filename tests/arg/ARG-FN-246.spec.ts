import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 전체채팅보내기 } from './helpers/social-state.helper.js';
import { 로비까지, 메인메뉴로 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-246',
  name: '다시 접속하면 채팅 창에 앞서 보낸 글이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: null,
  techniques: ['상태 전이'],
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('전체 채팅을 보낸 뒤 메인 메뉴로 나갔다가 다시 로그인하고 채팅 창을 연다', async () => {
    const 앞창 = await 채팅창.열기(game);
    await 전체채팅보내기(앞창, params.보낼글);
    const 앞줄들 = await 앞창.줄글들();
    await verify('보낸 글이 채팅 창에 보인다', 앞줄들.some((줄) => 줄.includes(params.보낼글)), true, { blocker: true });
    await 메인메뉴로(game);
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 뒷창 = await 채팅창.열기(game);
    await verify('다시 접속한 채팅 창에 줄이 하나 이상 보인다', await 뒷창.첫줄뜨는지(), true, { blocker: true });
    const 뒷줄들 = await 뒷창.줄글들();
    await verify('다시 접속하면 채팅 창에 앞서 보낸 글이 보이지 않는다', 뒷줄들.some((줄) => 줄.includes(params.보낼글)), false);
  });
});
