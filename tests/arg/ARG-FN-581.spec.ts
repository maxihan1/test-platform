import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-581',
  name: '점검으로 내보낼 때 안내 문구를 못 읽으면 「서버 점검 중입니다」를 보여 준다',
  platforms: ['android'],
  precondition: ['점검 안내 문구가 비어 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('운영툴에서 점검을 켜고 기다린다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('점검으로 내보낼 때 안내 문구를 못 읽으면 「서버 점검 중입니다」를 보여 준다', await 뜨는지(game, 화면글자('서버 점검 중입니다')), true);
  });
});
