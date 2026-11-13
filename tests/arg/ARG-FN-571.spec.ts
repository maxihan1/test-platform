import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-571',
  name: '접속 중인 계정이 정지되면 30초 안에 저장 후 내보내고 「이용 정지 계정」 창에 「사유: <사유>」를 보여 주며 「종료 예정」 줄은 붙이지 않는다',
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
  await test.step('운영툴에서 계정을 정지하고 기다린다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('접속 중인 계정이 정지되면 30초 안에 저장 후 내보내고 「이용 정지 계정」 창에 「사유: <사유>」를 보여 주며 「종료 예정」 줄은 붙이지 않는다', await 뜨는지(game, 화면글자('이용 정지 계정')), true);
  });
});
