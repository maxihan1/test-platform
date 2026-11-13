import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-635',
  name: '길드장이 아닌 사람이 초대하면 「길드장만 초대할 수 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['길드장이 아닌 길드원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「초대」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드장이 아닌 사람이 초대하면 「길드장만 초대할 수 있습니다」가 뜬다', await 뜨는지(game, 화면글자('길드장만 초대할 수 있습니다')), true);
  });
});
