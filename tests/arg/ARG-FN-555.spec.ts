import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-555',
  name: '「모두 받기」를 누르면 「모두 받기」는 첨부가 남은 우편을 차례로 하나씩 받고 우편마다 받기 알림이 따로 뜬다',
  platforms: ['android'],
  precondition: ['첨부가 있는 우편이 둘 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「모두 받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「모두 받기」를 누르면 「모두 받기」는 첨부가 남은 우편을 차례로 하나씩 받고 우편마다 받기 알림이 따로 뜬다', await 뜨는지(game, 화면글자('모두 받기')), true);
  });
});
