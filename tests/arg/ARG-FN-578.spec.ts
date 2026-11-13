import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-578',
  name: '서버 상태 읽기에 실패하면 바로 전에 읽은 공지 내용을 그대로 쓴다',
  platforms: ['android'],
  precondition: ['공지가 켜져 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('와이파이를 끊고 1분을 지켜본다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('서버 상태 읽기에 실패하면 바로 전에 읽은 공지 내용을 그대로 쓴다', await 있는지(game, 공통HUD.상단바), true);
  });
});
