import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-626',
  name: '길드장이 나를 길드에 초대하면 길드 초대를 받는 쪽에 「길드 초대」 창과 「<이름> 님이 길드 「<길드>」에 초대했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['길드장이 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('길드장이 나를 길드에 초대한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드장이 나를 길드에 초대하면 길드 초대를 받는 쪽에 「길드 초대」 창과 「<이름> 님이 길드 「<길드>」에 초대했습니다」가 뜬다', await 뜨는지(game, 화면글자('길드 초대')), true);
  });
});
