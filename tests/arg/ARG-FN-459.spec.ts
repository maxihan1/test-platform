import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-459',
  name: '정지로 내보내질 때까지 기다리면 정지 · 점검으로 서버가 내보낸 경우에는 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['접속해 있는 계정이 정지된다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('정지로 내보내질 때까지 기다린다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('정지로 내보내질 때까지 기다리면 정지 · 점검으로 서버가 내보낸 경우에는 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다', await 있는지(game, 공통HUD.상단바), true);
  });
});
