import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-569',
  name: '채팅 금지 기간은 끝이 없으면 「해제할 때까지」, 있으면 「<시각> (UTC) 까지」로 보인다',
  platforms: ['android'],
  precondition: ['계정에 끝나는 시각이 없는 채팅 금지가 걸려 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('채팅을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('채팅 금지 기간은 끝이 없으면 「해제할 때까지」, 있으면 「<시각> (UTC) 까지」로 보인다', await 뜨는지(game, 화면글자('해제할 때까지')), true);
  });
});
