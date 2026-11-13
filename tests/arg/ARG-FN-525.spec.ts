import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-525',
  name: '쓰러진 상태에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['던전에서 쓰러져 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「물약」을 누른다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('쓰러진 상태에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다', await 뜨는지(game, 화면글자('던전에서 살아 있을 때만 쓸 수 있습니다')), true);
  });
});
