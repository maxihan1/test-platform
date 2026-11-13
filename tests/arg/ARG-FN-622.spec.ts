import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-622',
  name: '골드가 500 미만이면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다',
  platforms: ['android'],
  precondition: ['골드가 500 미만이고 길드가 없다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('골드가 500 미만이면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다', await 뜨는지(game, 화면글자('길드를 만들려면 500 골드가 필요합니다')), true);
  });
});
