import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-615',
  name: '초대를 수락했는데 그사이 파티가 4명이 됐으면 받은 쪽에 「파티 인원이 가득 찼습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['파티 초대를 받았고 그사이 파티가 4명이 됐다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「수락」을 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('초대를 수락했는데 그사이 파티가 4명이 됐으면 받은 쪽에 「파티 인원이 가득 찼습니다」가 뜬다', await 뜨는지(game, 화면글자('파티 인원이 가득 찼습니다')), true);
  });
});
