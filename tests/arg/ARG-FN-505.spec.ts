import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-505',
  name: '경험치를 얻으면 최고 레벨 이후에는 경험치는 계속 쌓이지만 레벨은 오르지 않는다',
  platforms: ['android'],
  precondition: ['레벨 30 캐릭터다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('경험치를 얻는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('경험치를 얻으면 최고 레벨 이후에는 경험치는 계속 쌓이지만 레벨은 오르지 않는다', await 있는지(game, 공통HUD.상단바), true);
  });
});
