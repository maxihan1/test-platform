import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-543',
  name: '접속 중이면 서버가 30초마다 우편함을 다시 읽고 새 우편이 있으면 「새 우편 <수>통이 도착했습니다」 알림을 띄운다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('운영툴에서 우편을 보내고 30초를 지켜본다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('접속 중이면 서버가 30초마다 우편함을 다시 읽고 새 우편이 있으면 「새 우편 <수>통이 도착했습니다」 알림을 띄운다', await 뜨는지(game, 화면글자('새 우편')), true);
  });
});
