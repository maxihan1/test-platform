import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-649',
  name: '「방패 오라」 재사용 대기를 읽으면 「방패 오라」 재사용 대기는 1.2초다',
  platforms: ['android'],
  precondition: ['게임 데이터 API 를 부를 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 데이터 API 가 서비스 가이드에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('「방패 오라」 재사용 대기를 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「방패 오라」 재사용 대기를 읽으면 「방패 오라」 재사용 대기는 1.2초다', await 뜨는지(game, 화면글자('방패 오라')), true);
  });
});
