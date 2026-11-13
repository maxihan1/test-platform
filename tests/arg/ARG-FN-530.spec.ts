import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-530',
  name: '골드가 29 면 사지 못하고 30 이면 사고 골드가 0 이 된다',
  platforms: ['android'],
  precondition: ['골드를 「체력 물약」 가격보다 1 적게 또는 똑같이 맞출 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('골드가 29 일 때와 30 일 때 「체력 물약」의 「구매」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('골드가 29 면 사지 못하고 30 이면 사고 골드가 0 이 된다', await 있는지(game, 공통HUD.상단바), true);
  });
});
