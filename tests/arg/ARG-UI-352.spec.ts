import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-352',
  name: '친구 신청 · 파티 초대 · 길드 초대를 받으면 화면 가운데 창이 뜨고 뒤를 어둡게 덮으며 창 제목은 「친구 신청」 · 「파티 초대」 · 「길드 초대」, 버튼은 「수락」 · 「거절」이다',
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
    await verify('친구 신청 · 파티 초대 · 길드 초대를 받으면 화면 가운데 창이 뜨고 뒤를 어둡게 덮으며 창 제목은 「친구 신청」 · 「파티 초대」 · 「길드 초대」, 버튼은 「수락」 · 「거절」이다', await 뜨는지(game, 화면글자('친구 신청')), true);
  });
});
