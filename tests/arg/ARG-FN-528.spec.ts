import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-528',
  name: '상단 바 골드를 확인하면 골드는 천 단위마다 쉼표를 찍어 보여 준다(예 「1,250 G」)',
  platforms: ['android'],
  precondition: ['골드가 1,000 이상이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('상단 바 골드를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상단 바 골드를 확인하면 골드는 천 단위마다 쉼표를 찍어 보여 준다(예 「1,250 G」)', await 뜨는지(game, 화면글자('1,250 G')), true);
  });
});
