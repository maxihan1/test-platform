import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-236',
  name: '채팅 입력 칸에 100자를 넣으면 100자가 다 들어간다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    한도글자수: z.number().int().min(1).describe('채팅 입력 칸에 넣을 글자 수 — 한도 100자').default(100),
    넘는글자수: z.number().int().min(1).describe('채팅 입력 칸에 넣을 글자 수 — 한도보다 1자 많은 101자').default(101),
  }),
  expected: z.object({
    한도글자수: z.number().describe('100자를 넣었을 때 들어간 글자 수').default(100),
    넘는글자수: z.number().describe('101자를 넣었을 때 들어간 글자 수').default(100),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ game, params, expected }) => {
  let 창: 채팅창;

  await test.step('일반 회원으로 로비에 들어가 채팅 창을 연다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 채팅창.열기(game);
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 입력 칸에 100자를 넣는다', async () => {
    const 들어간글 = await 창.글넣기('a'.repeat(params.한도글자수));
    await verify('채팅 입력 칸에 100자를 넣으면 100자가 다 들어간다', 들어간글.length, expected.한도글자수);
  });

  await test.step('채팅 입력 칸에 101자를 넣는다', async () => {
    const 들어간글 = await 창.글넣기('a'.repeat(params.넘는글자수));
    await verify('101자는 입력 칸에 100자만 들어간다', 들어간글.length, expected.넘는글자수);
  });
});
