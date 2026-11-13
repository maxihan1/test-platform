import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-595',
  name: '접속 중이 아닌 캐릭터에게 친구 신청을 하면 「접속 중인 캐릭터에게만 신청할 수 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['친구가 아니면서 접속하지 않은 캐릭터가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 조건에 맞는 캐릭터나 길드 이름을 찾을 길 없음(목록 API 가 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 이름으로 「친구 신청」을 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('접속 중이 아닌 캐릭터에게 친구 신청을 하면 「접속 중인 캐릭터에게만 신청할 수 있습니다」가 뜬다', await 뜨는지(game, 화면글자('접속 중인 캐릭터에게만 신청할 수 있습니다')), true);
  });
});
