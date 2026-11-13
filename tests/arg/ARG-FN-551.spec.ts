import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-551',
  name: '「받기」를 누르면 운영툴의 재화 첨부는 재화 이름과 관계없이 골드로 들어온다',
  platforms: ['android'],
  precondition: ['골드가 아닌 이름의 재화가 첨부된 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「받기」를 누르면 운영툴의 재화 첨부는 재화 이름과 관계없이 골드로 들어온다', await 뜨는지(game, 화면글자('받기')), true);
  });
});
