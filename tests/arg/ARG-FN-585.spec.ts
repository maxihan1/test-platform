import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-585',
  name: '그 캐릭터가 나에게 친구 신청을 보내면 친구 신청을 받는 쪽에 「친구 신청」 창이 뜨고 「<이름> 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다',
  platforms: ['android'],
  precondition: ['다른 캐릭터가 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 캐릭터가 나에게 친구 신청을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('그 캐릭터가 나에게 친구 신청을 보내면 친구 신청을 받는 쪽에 「친구 신청」 창이 뜨고 「<이름> 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다', await 뜨는지(game, 화면글자('친구 신청')), true);
  });
});
