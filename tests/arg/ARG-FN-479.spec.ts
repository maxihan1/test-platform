import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-479',
  name: '들 수 있는 물건을 고르고 있으면 「공격」 버튼이 「들기」가 된다',
  platforms: ['android'],
  precondition: ['던전에서 항아리를 선택하고 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「공격」 버튼을 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('들 수 있는 물건을 고르고 있으면 「공격」 버튼이 「들기」가 된다', await 뜨는지(game, 화면글자('공격')), true);
  });
});
