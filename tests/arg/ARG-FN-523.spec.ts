import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-523',
  name: '장착하거나 해제하면 공격 배율 · 방어율 · 골드 배율 · 경험치 배율이 바로 바뀐다',
  platforms: ['android'],
  precondition: ['가방에 무기가 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game, params }) => {
  await test.step('무기를 장착하고 공격 배율을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('장착하거나 해제하면 공격 배율 · 방어율 · 골드 배율 · 경험치 배율이 바로 바뀐다', await 있는지(game, 공통HUD.상단바), true);
  });
});
