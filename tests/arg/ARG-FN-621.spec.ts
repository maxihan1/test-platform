import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-621',
  name: '골드가 499 면 「길드를 만들려면 500 골드가 필요합니다」가 뜨고 500 이면 길드가 만들어진다',
  platforms: ['android'],
  precondition: ['골드를 499 와 500 으로 맞출 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('골드가 499 일 때와 500 일 때 「만들기 · 500G」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('골드가 499 면 「길드를 만들려면 500 골드가 필요합니다」가 뜨고 500 이면 길드가 만들어진다', await 뜨는지(game, 화면글자('길드를 만들려면 500 골드가 필요합니다')), true);
  });
});
