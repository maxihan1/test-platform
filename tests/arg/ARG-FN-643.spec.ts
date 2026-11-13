import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-643',
  name: '퀘스트 보상과 판매 골드를 받으면 「골드 획득」 효과는 처치 골드에만 붙고 퀘스트 보상 · 판매 · 우편 골드에는 붙지 않는다',
  platforms: ['android'],
  precondition: ['「행운의 반지」를 장착했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('퀘스트 보상과 판매 골드를 받는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('퀘스트 보상과 판매 골드를 받으면 「골드 획득」 효과는 처치 골드에만 붙고 퀘스트 보상 · 판매 · 우편 골드에는 붙지 않는다', await 뜨는지(game, 화면글자('골드 획득')), true);
  });
});
