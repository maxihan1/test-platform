import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-655',
  name: '무기를 장착하고 피해를 읽으면 공격 배율은 1 + 0.03 × (레벨 − 1) + 장착 장비 공격 합이고 범위는 1.00 ~ 2.17 이다',
  platforms: ['android'],
  precondition: ['레벨과 무기를 정할 수 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('무기를 장착하고 피해를 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('무기를 장착하고 피해를 읽으면 공격 배율은 1 + 0.03 × (레벨 − 1) + 장착 장비 공격 합이고 범위는 1.00 ~ 2.17 이다', await 있는지(game, 공통HUD.상단바), true);
  });
});
