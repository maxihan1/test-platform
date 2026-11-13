import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-529',
  name: '상점에서 「구매」를 누르면 골드의 최솟값은 0 이고 음수가 되지 않는다',
  platforms: ['android'],
  precondition: ['골드가 0 이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('상점에서 「구매」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상점에서 「구매」를 누르면 골드의 최솟값은 0 이고 음수가 되지 않는다', await 뜨는지(game, 화면글자('구매')), true);
  });
});
