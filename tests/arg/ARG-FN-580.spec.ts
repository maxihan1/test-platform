import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-580',
  name: '점검이 걸리면 게임 서버가 30초마다 접속자 상태를 다시 읽어 점검으로 막힌 계정을 저장한 뒤 내보내고 「서버 점검 중」 창에 점검 안내 문구를 보여 준다',
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
  await test.step('운영툴에서 점검을 켜고 기다린다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('점검이 걸리면 게임 서버가 30초마다 접속자 상태를 다시 읽어 점검으로 막힌 계정을 저장한 뒤 내보내고 「서버 점검 중」 창에 점검 안내 문구를 보여 준다', await 뜨는지(game, 화면글자('서버 점검 중')), true);
  });
});
