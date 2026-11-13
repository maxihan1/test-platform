import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-553',
  name: '받기가 끝나면 운영툴 지급 이력에서 그 우편이 「받음」 상태가 되고 「기록 › 아이템 흐름」에 「수령」 줄이 남는다',
  platforms: ['android'],
  precondition: ['첨부가 있는 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「받기」를 누르고 운영툴 지급 이력을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('받기가 끝나면 운영툴 지급 이력에서 그 우편이 「받음」 상태가 되고 「기록 › 아이템 흐름」에 「수령」 줄이 남는다', await 뜨는지(game, 화면글자('받음')), true);
  });
});
