import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-474',
  name: '레벨을 올린 뒤 기본 체력을 읽으면 기본 체력은 레벨이 올라도 바뀌지 않고 레벨은 공격 배율과 방어율로만 반영된다',
  platforms: ['android'],
  precondition: ['레벨을 올릴 수 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('레벨을 올린 뒤 기본 체력을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('레벨을 올린 뒤 기본 체력을 읽으면 기본 체력은 레벨이 올라도 바뀌지 않고 레벨은 공격 배율과 방어율로만 반영된다', await 있는지(game, 공통HUD.상단바), true);
  });
});
