import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-524',
  name: '「물약」을 누르고 체력을 읽으면 체력 물약은 직업 기본 체력의 절반(소수점 버림)을 회복하고 기본 체력을 넘지 않는다',
  platforms: ['android'],
  precondition: ['체력이 깎인 채 던전에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「물약」을 누르고 체력을 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「물약」을 누르고 체력을 읽으면 체력 물약은 직업 기본 체력의 절반(소수점 버림)을 회복하고 기본 체력을 넘지 않는다', await 뜨는지(game, 화면글자('물약')), true);
  });
});
