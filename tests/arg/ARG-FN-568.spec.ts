import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-568',
  name: '채팅 금지 계정이 채팅을 보내면 서버가 막고 「채팅이 금지된 계정입니다 · <기간> · 사유: <사유>」 오류 알림을 띄운다',
  platforms: ['android'],
  precondition: ['계정에 채팅 금지가 걸려 있다'],
  techniques: ['동등 분할'],
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
    await verify('채팅 금지 계정이 채팅을 보내면 서버가 막고 「채팅이 금지된 계정입니다 · <기간> · 사유: <사유>」 오류 알림을 띄운다', await 뜨는지(game, 화면글자('채팅이 금지된 계정입니다 ·')), true);
  });
});
