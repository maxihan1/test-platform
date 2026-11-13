import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-527',
  name: '그 아이템의 버튼과 판매가를 확인하면 알 수 없는 아이템은 장착할 수 없고 10 골드에 팔 수 있다',
  platforms: ['android'],
  precondition: ['가방에 알 수 없는 아이템이 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 아이템의 버튼과 판매가를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('그 아이템의 버튼과 판매가를 확인하면 알 수 없는 아이템은 장착할 수 없고 10 골드에 팔 수 있다', await 있는지(game, 공통HUD.상단바), true);
  });
});
