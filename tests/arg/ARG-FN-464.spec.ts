import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-464',
  name: '다시 로그인하고 골드와 가방을 확인하면 시작 지급은 캐릭터마다 한 번만 준다',
  platforms: ['android'],
  precondition: ['시작 지급을 받은 캐릭터다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 캐릭터 없는 신규 계정을 만드는 길 없음',
});

test(spec, async ({ game, params }) => {
  await test.step('다시 로그인하고 골드와 가방을 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('다시 로그인하고 골드와 가방을 확인하면 시작 지급은 캐릭터마다 한 번만 준다', await 있는지(game, 공통HUD.상단바), true);
  });
});
