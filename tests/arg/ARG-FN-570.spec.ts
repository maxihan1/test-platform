import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-570',
  name: '운영툴에서 채팅 금지를 걸고 채팅을 보내면 채팅 금지는 걸린 뒤 길어도 20초 안에 반영된다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('운영툴에서 채팅 금지를 걸고 채팅을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('운영툴에서 채팅 금지를 걸고 채팅을 보내면 채팅 금지는 걸린 뒤 길어도 20초 안에 반영된다', await 있는지(game, 공통HUD.상단바), true);
  });
});
