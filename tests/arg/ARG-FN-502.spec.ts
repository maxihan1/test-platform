import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-502',
  name: '경험치가 다음 레벨 필요량 이상이면 필요량을 빼고 레벨을 1 올리고, 한 번에 여러 레벨이 오를 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('다음 레벨 필요량 이상의 경험치를 얻는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('경험치가 다음 레벨 필요량 이상이면 필요량을 빼고 레벨을 1 올리고, 한 번에 여러 레벨이 오를 수 있다', await 있는지(game, 공통HUD.상단바), true);
  });
});
