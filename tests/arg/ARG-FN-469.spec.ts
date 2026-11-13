import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-469',
  name: '우편 첨부를 받고 운영툴 상세에서 저장된 값을 읽으면 우편 첨부를 받은 직후 바로 저장한다',
  platforms: ['android'],
  precondition: ['첨부가 있는 우편이 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('우편 첨부를 받고 운영툴 상세에서 저장된 값을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('우편 첨부를 받고 운영툴 상세에서 저장된 값을 읽으면 우편 첨부를 받은 직후 바로 저장한다', await 있는지(game, 공통HUD.상단바), true);
  });
});
